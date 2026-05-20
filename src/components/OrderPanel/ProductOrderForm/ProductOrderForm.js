import React, { useEffect, useRef, useState } from 'react';
import { Form as FinalForm, FormSpy } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import {
  numberAtLeast,
  required,
  autocompleteSearchRequired,
  autocompletePlaceSelected,
  composeValidators,
} from '../../../util/validators';
import { PURCHASE_PROCESS_NAME } from '../../../transactions/transaction';
import { checkDeliveryRadius } from '../../../util/api';

import {
  Form,
  FieldSelect,
  FieldTextInput,
  FieldLocationAutocompleteInput,
  InlineTextButton,
  PrimaryButton,
  H3,
  H6,
} from '../../../components';

import EstimatedCustomerBreakdownMaybe from '../EstimatedCustomerBreakdownMaybe';

import FetchLineItemsError from '../FetchLineItemsError/FetchLineItemsError.js';

import css from './ProductOrderForm.module.css';

// Browsers can't render huge number of select options.
// (stock is shown inside select element)
// Note: input element could allow ordering bigger quantities
const MAX_QUANTITY_FOR_DROPDOWN = 100;

const identity = v => v;

const handleFetchLineItems = ({
  quantity,
  deliveryMethod,
  displayDeliveryMethod,
  listingId,
  isOwnListing,
  fetchLineItemsInProgress,
  onFetchTransactionLineItems,
}) => {
  const stockReservationQuantity = Number.parseInt(quantity, 10);
  const deliveryMethodMaybe = deliveryMethod ? { deliveryMethod } : {};
  const isBrowser = typeof window !== 'undefined';
  if (
    isBrowser &&
    stockReservationQuantity &&
    (!displayDeliveryMethod || deliveryMethod) &&
    !fetchLineItemsInProgress
  ) {
    onFetchTransactionLineItems({
      orderData: { stockReservationQuantity, ...deliveryMethodMaybe },
      listingId,
      isOwnListing,
    });
  }
};

const DeliveryMethodMaybe = props => {
  const {
    displayDeliveryMethod,
    hasMultipleDeliveryMethods,
    deliveryMethod,
    hasStock,
    formId,
    intl,
  } = props;
  const showDeliveryMethodSelector = displayDeliveryMethod && hasMultipleDeliveryMethods;
  const showSingleDeliveryMethod = displayDeliveryMethod && deliveryMethod;
  return !hasStock ? null : showDeliveryMethodSelector ? (
    <FieldSelect
      id={`${formId}.deliveryMethod`}
      className={css.deliveryField}
      name="deliveryMethod"
      label={intl.formatMessage({ id: 'ProductOrderForm.deliveryMethodLabel' })}
      validate={required(intl.formatMessage({ id: 'ProductOrderForm.deliveryMethodRequired' }))}
    >
      <option disabled value="">
        {intl.formatMessage({ id: 'ProductOrderForm.selectDeliveryMethodOption' })}
      </option>
      <option value={'pickup'}>
        {intl.formatMessage({ id: 'ProductOrderForm.pickupOption' })}
      </option>
      <option value={'shipping'}>
        {intl.formatMessage({ id: 'ProductOrderForm.shippingOption' })}
      </option>
    </FieldSelect>
  ) : showSingleDeliveryMethod ? (
    <div className={css.deliveryField}>
      <H3 rootClassName={css.singleDeliveryMethodLabel}>
        {intl.formatMessage({ id: 'ProductOrderForm.deliveryMethodLabel' })}
      </H3>
      <p className={css.singleDeliveryMethodSelected}>
        {deliveryMethod === 'shipping'
          ? intl.formatMessage({ id: 'ProductOrderForm.shippingOption' })
          : intl.formatMessage({ id: 'ProductOrderForm.pickupOption' })}
      </p>
      <FieldTextInput
        id={`${formId}.deliveryMethod`}
        className={css.deliveryField}
        name="deliveryMethod"
        type="hidden"
      />
    </div>
  ) : (
    <FieldTextInput
      id={`${formId}.deliveryMethod`}
      className={css.deliveryField}
      name="deliveryMethod"
      type="hidden"
    />
  );
};

const renderForm = formRenderProps => {
  const [mounted, setMounted] = useState(false);
  const [deliveryRangeStatus, setDeliveryRangeStatus] = useState(null);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState(null);
  const [locationTouched, setLocationTouched] = useState(false);
  const prevLineItemValuesRef = useRef(null);

  const {
    // FormRenderProps from final-form
    handleSubmit,
    form: formApi,

    // Custom props passed to the form component
    intl,
    formId,
    currentStock,
    allowOrdersOfMultipleItems,
    hasMultipleDeliveryMethods,
    displayDeliveryMethod,
    listingId,
    isOwnListing,
    onFetchTransactionLineItems,
    onContactUser,
    lineItems,
    fetchLineItemsInProgress,
    fetchLineItemsError,
    price,
    payoutDetailsWarning,
    marketplaceName,
    values,
    onMakeOffer,
    deliveryRadiusKm,
    sellerGeolocation,
  } = formRenderProps;

  // Initialize ref synchronously on first render so handleOnChange never sees a null prev
  if (prevLineItemValuesRef.current === null) {
    prevLineItemValuesRef.current = {
      quantity: values.quantity,
      deliveryMethod: values.deliveryMethod,
    };
  }

  // Note: don't add custom logic before useEffect
  useEffect(() => {
    setMounted(true);

    // Side-effect: fetch line-items after mounting if possible
    const { quantity, deliveryMethod } = values;
    if (quantity && !formRenderProps.hasMultipleDeliveryMethods) {
      handleFetchLineItems({
        quantity,
        deliveryMethod,
        displayDeliveryMethod,
        listingId,
        isOwnListing,
        fetchLineItemsInProgress,
        onFetchTransactionLineItems,
      });
    }
  }, []);

  const isShipping = values?.deliveryMethod === 'shipping';

  // Reset location check when delivery method switches away from shipping
  useEffect(() => {
    if (!isShipping) {
      setDeliveryRangeStatus(null);
      setDeliveryDistanceKm(null);
    }
  }, [isShipping]);

  const handleDeliveryLocationChange = value => {
    setDeliveryRangeStatus(null);
    setDeliveryDistanceKm(null);
    setLocationTouched(false);

    if (value?.selectedPlace?.origin && sellerGeolocation && deliveryRadiusKm) {
      setDeliveryRangeStatus('checking');
      const { origin: buyerOrigin } = value.selectedPlace;
      checkDeliveryRadius({
        buyerLat: buyerOrigin.lat,
        buyerLng: buyerOrigin.lng,
        sellerLat: sellerGeolocation.lat,
        sellerLng: sellerGeolocation.lng,
        deliveryRadiusKm,
      })
        .then(result => {
          setDeliveryDistanceKm(result.distanceKm);
          setDeliveryRangeStatus(result.withinRadius ? 'inRange' : 'outOfRange');
        })
        .catch(() => {
          setDeliveryRangeStatus('error');
        });
    }
  };

  // If form values change, update line-items for the order breakdown
  const handleOnChange = formValues => {
    const { quantity, deliveryMethod } = formValues.values;
    const prev = prevLineItemValuesRef.current;
    if (mounted && (quantity !== prev.quantity || deliveryMethod !== prev.deliveryMethod)) {
      prevLineItemValuesRef.current = { quantity, deliveryMethod };
      handleFetchLineItems({
        quantity,
        deliveryMethod,
        listingId,
        isOwnListing,
        fetchLineItemsInProgress,
        onFetchTransactionLineItems,
      });
    }
  };

  // In case quantity and deliveryMethod are missing focus on that select-input.
  // Otherwise continue with the default handleSubmit function.
  const handleFormSubmit = e => {
    const { quantity, deliveryMethod } = values || {};
    if (!quantity || quantity < 1) {
      e.preventDefault();
      // Blur event will show validator message
      formApi.blur('quantity');
      formApi.focus('quantity');
    } else if (displayDeliveryMethod && !deliveryMethod) {
      e.preventDefault();
      // Blur event will show validator message
      formApi.blur('deliveryMethod');
      formApi.focus('deliveryMethod');
    } else if (isShipping && deliveryRadiusKm != null && !values?.shippingLocation?.selectedPlace) {
      e.preventDefault();
      setLocationTouched(true);
    } else {
      handleSubmit(e);
    }
  };

  const breakdownData = {};
  const showBreakdown =
    breakdownData && lineItems && !fetchLineItemsInProgress && !fetchLineItemsError;

  const showContactUser = typeof onContactUser === 'function';

  const onClickContactUser = e => {
    e.preventDefault();
    onContactUser();
  };

  const contactSellerLink = (
    <InlineTextButton onClick={onClickContactUser}>
      <FormattedMessage id="ProductOrderForm.finePrintNoStockLinkText" />
    </InlineTextButton>
  );
  const quantityRequiredMsg = intl.formatMessage({ id: 'ProductOrderForm.quantityRequired' });

  // Listing is out of stock if currentStock is zero.
  // Undefined/null stock means that stock has never been set.
  const hasNoStockLeft = typeof currentStock != null && currentStock === 0;
  const hasStock = currentStock && currentStock > 0;
  const hasOneItemLeft = currentStock === 1;
  const selectableStock =
    currentStock > MAX_QUANTITY_FOR_DROPDOWN ? MAX_QUANTITY_FOR_DROPDOWN : currentStock;
  const quantities = hasStock ? [...Array(selectableStock).keys()].map(i => i + 1) : [];

  const submitInProgress = fetchLineItemsInProgress;
  const submitDisabled = !hasStock || deliveryRangeStatus === 'outOfRange';

  return (
    <Form onSubmit={handleFormSubmit}>
      <FormSpy subscription={{ values: true }} onChange={handleOnChange} />
      {hasNoStockLeft ? null : hasOneItemLeft || !allowOrdersOfMultipleItems ? (
        <FieldTextInput
          id={`${formId}.quantity`}
          className={css.quantityField}
          name="quantity"
          type="hidden"
          validate={numberAtLeast(quantityRequiredMsg, 1)}
        />
      ) : (
        <FieldSelect
          id={`${formId}.quantity`}
          className={css.quantityField}
          name="quantity"
          disabled={!hasStock}
          label={intl.formatMessage({ id: 'ProductOrderForm.quantityLabel' })}
          validate={numberAtLeast(quantityRequiredMsg, 1)}
        >
          <option disabled value="">
            {intl.formatMessage({ id: 'ProductOrderForm.selectQuantityOption' })}
          </option>
          {quantities.map(quantity => (
            <option key={quantity} value={quantity}>
              {intl.formatMessage({ id: 'ProductOrderForm.quantityOption' }, { quantity })}
            </option>
          ))}
        </FieldSelect>
      )}

      <DeliveryMethodMaybe
        displayDeliveryMethod={displayDeliveryMethod}
        hasMultipleDeliveryMethods={hasMultipleDeliveryMethods}
        deliveryMethod={values?.deliveryMethod}
        hasStock={hasStock}
        formId={formId}
        intl={intl}
      />

      {isShipping && deliveryRadiusKm != null ? (
        <div>
          <FieldLocationAutocompleteInput
            rootClassName={css.locationAddress}
            inputClassName={css.locationAutocompleteInput}
            iconClassName={css.locationAutocompleteInputIcon}
            predictionsClassName={css.predictionsRoot}
            validClassName={css.validLocation}
            name="shippingLocation"
            id={`${formId}.shippingLocation`}
            label={intl.formatMessage({ id: 'ProductOrderForm.shippingLocationLabel' })}
            placeholder={intl.formatMessage({ id: 'ProductOrderForm.shippingLocationPlaceholder' })}
            useDefaultPredictions={false}
            format={identity}
            valueFromForm={values.shippingLocation}
            validate={composeValidators(
              autocompleteSearchRequired(
                intl.formatMessage({ id: 'ProductOrderForm.shippingLocationRequired' })
              ),
              autocompletePlaceSelected(
                intl.formatMessage({ id: 'ProductOrderForm.shippingLocationNotRecognized' })
              )
            )}
            hideErrorMessage={!locationTouched}
            onChange={handleDeliveryLocationChange}
          />
          {deliveryRangeStatus === 'checking' ? (
            <p className={css.deliveryChecking}>
              {intl.formatMessage({ id: 'ProductOrderForm.checkingDelivery' })}
            </p>
          ) : locationTouched && !values?.shippingLocation?.selectedPlace ? (
            <p className={css.deliveryError}>
              {intl.formatMessage({ id: 'ProductOrderForm.shippingLocationRequired' })}
            </p>
          ) : deliveryRangeStatus === 'inRange' ? (
            <p className={css.deliverySuccess}>
              {intl.formatMessage(
                { id: 'ProductOrderForm.withinDeliveryRange' },
                { distance: deliveryDistanceKm }
              )}
            </p>
          ) : deliveryRangeStatus === 'outOfRange' ? (
            <p className={css.deliveryError}>
              {intl.formatMessage(
                { id: 'ProductOrderForm.outOfDeliveryRange' },
                { deliveryRadius: deliveryRadiusKm, distance: deliveryDistanceKm }
              )}
            </p>
          ) : deliveryRangeStatus === 'error' ? (
            <p className={css.deliveryError}>
              {intl.formatMessage({ id: 'ProductOrderForm.deliveryCheckError' })}
            </p>
          ) : null}
        </div>
      ) : null}

      {showBreakdown ? (
        <div className={css.breakdownWrapper}>
          <H6 as="h3" className={css.bookingBreakdownTitle}>
            <FormattedMessage id="ProductOrderForm.breakdownTitle" />
          </H6>
          <hr className={css.totalDivider} />
          <EstimatedCustomerBreakdownMaybe
            breakdownData={breakdownData}
            lineItems={lineItems}
            currency={price.currency}
            marketplaceName={marketplaceName}
            processName={PURCHASE_PROCESS_NAME}
          />
        </div>
      ) : null}

      <FetchLineItemsError error={fetchLineItemsError} />

      <div className={css.submitButton}>
        <PrimaryButton type="submit" inProgress={submitInProgress} disabled={submitDisabled}>
          {hasStock ? (
            <FormattedMessage id="ProductOrderForm.ctaButton" />
          ) : (
            <FormattedMessage id="ProductOrderForm.ctaButtonNoStock" />
          )}
        </PrimaryButton>
      </div>
      <p className={css.finePrint}>
        {payoutDetailsWarning ? (
          payoutDetailsWarning
        ) : hasStock && isOwnListing ? (
          <FormattedMessage id="ProductOrderForm.ownListing" />
        ) : hasStock ? (
          <FormattedMessage id="ProductOrderForm.finePrint" />
        ) : showContactUser ? (
          <FormattedMessage id="ProductOrderForm.finePrintNoStock" values={{ contactSellerLink }} />
        ) : null}
      </p>
      {!isOwnListing && hasStock && onMakeOffer ? (
        <div className={css.makeOfferButton}>
          <PrimaryButton type="button" onClick={onMakeOffer}>
            <FormattedMessage id="ProductOrderForm.makeOfferButton" />
          </PrimaryButton>
        </div>
      ) : null}
    </Form>
  );
};

/**
 * A form for ordering a product.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} props.marketplaceName - The name of the marketplace
 * @param {string} props.formId - The ID of the form
 * @param {Function} props.onSubmit - The function to handle the form submission
 * @param {propTypes.uuid} props.listingId - The ID of the listing
 * @param {propTypes.money} props.price - The price of the listing
 * @param {number} props.currentStock - The current stock of the listing
 * @param {boolean} props.isOwnListing - Whether the listing is owned by the current user
 * @param {boolean} props.pickupEnabled - Whether pickup is enabled
 * @param {boolean} props.shippingEnabled - Whether shipping is enabled
 * @param {boolean} props.displayDeliveryMethod - Whether the delivery method is displayed
 * @param {Object} props.lineItems - The line items
 * @param {Function} props.onFetchTransactionLineItems - The function to fetch the transaction line items
 * @param {boolean} props.fetchLineItemsInProgress - Whether the line items are being fetched
 * @param {propTypes.error} props.fetchLineItemsError - The error for fetching the line items
 * @param {Function} props.onContactUser - The function to contact the user
 * @returns {JSX.Element}
 */
const ProductOrderForm = props => {
  const intl = useIntl();
  const {
    price,
    currentStock,
    pickupEnabled,
    shippingEnabled,
    displayDeliveryMethod,
    allowOrdersOfMultipleItems,
  } = props;

  // Should not happen for listings that go through EditListingWizard.
  // However, this might happen for imported listings.
  if (displayDeliveryMethod && !pickupEnabled && !shippingEnabled) {
    return (
      <p className={css.error}>
        <FormattedMessage id="ProductOrderForm.noDeliveryMethodSet" />
      </p>
    );
  }

  const hasOneItemLeft = currentStock && currentStock === 1;
  const hasOneItemMode = !allowOrdersOfMultipleItems && currentStock > 0;
  const quantityMaybe = hasOneItemLeft || hasOneItemMode ? { quantity: '1' } : {};
  const deliveryMethodMaybe =
    shippingEnabled && !pickupEnabled
      ? { deliveryMethod: 'shipping' }
      : !shippingEnabled && pickupEnabled
      ? { deliveryMethod: 'pickup' }
      : !shippingEnabled && !pickupEnabled
      ? { deliveryMethod: 'none' }
      : {};
  const hasMultipleDeliveryMethods = pickupEnabled && shippingEnabled;
  const initialValues = { ...quantityMaybe, ...deliveryMethodMaybe };

  return (
    <FinalForm
      initialValues={initialValues}
      hasMultipleDeliveryMethods={hasMultipleDeliveryMethods}
      displayDeliveryMethod={displayDeliveryMethod}
      {...props}
      intl={intl}
      render={renderForm}
    />
  );
};

export default ProductOrderForm;
