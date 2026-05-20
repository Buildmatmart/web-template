import React from 'react';
import { Form } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import { FieldTextInput, H3, Modal, PrimaryButton } from '../../../components';

import css from './MakeOfferModal.module.css';

/**
 * MakeOfferModal – a self-contained modal that lets a buyer submit an offer or counter-offer.
 *
 * @component
 * @param {Object}   props
 * @param {boolean}  props.isOpen                  - Whether the modal is open
 * @param {Function} props.onClose                 - Called when the modal is closed
 * @param {Function} props.onManageDisableScrolling - Passed through to Modal
 * @param {Object}   props.price                   - Listing price (money object with `amount` and `currency`)
 * @param {Function} props.onSubmitOffer            - Called with the offer amount (number) on submit
 * @param {string}   [props.headingText]            - Override the modal heading (e.g. for counter-offer)
 * @param {string}   [props.subHeadingText]         - Override the modal sub-heading
 * @param {string}   [props.submitText]             - Override the submit button label
 * @param {string}   [props.placeholder]            - Placeholder for the amount input
 * @param {boolean} [props.inProgress]             - Whether the offer submission is in progress (shows spinner)
 * @param {Object}  [props.submitError]             - Error returned from the makeOffer thunk
 * @param {number}   [props.minAmount]              - Override minimum allowed amount (major currency units). Defaults to 50 % of listing price.
 * @param {Object}   [props.initialValues]          - Initial form values, e.g. { offerAmount: '120' } to pre-fill for counter-offers
 */
const MakeOfferModal = props => {
  const {
    isOpen,
    onClose,
    onManageDisableScrolling,
    price,
    onSubmitOffer,
    headingText,
    subHeadingText,
    submitText,
    placeholder,
    minAmount: minAmountOverride,
    initialValues,
    inProgress,
    submitError,
  } = props;

  const intl = useIntl();

  // Minimum offer is 50 % of the listing price by default.
  // price.amount is in the smallest currency unit (cents), so divide by 200 to get 50 %.
  const minOfferAmount =
    minAmountOverride != null ? minAmountOverride : price ? Math.ceil(price.amount / 200) : 0;

  const validate = values => {
    const errors = {};
    const amount = parseFloat(values.offerAmount);

    if (!values.offerAmount || isNaN(amount) || amount <= 0) {
      errors.offerAmount = intl.formatMessage({ id: 'ListingPage.makeOfferAmountRequired' });
    }
    // else if (amount < minOfferAmount) {
    //   errors.offerAmount = intl.formatMessage(
    //     { id: 'ListingPage.makeOfferAmountTooLow' },
    //     { minAmount: `${minOfferAmount} ${price?.currency || ''}` }
    //   );
    // }

    return errors;
  };

  const handleSubmit = (values, form) => {
    onSubmitOffer(parseFloat(values.offerAmount));
    // form.reset() is called after the parent closes the modal on success
  };

  const errorMessage = submitError ? (
    <p className={css.submitError}>
      <FormattedMessage id="ListingPage.makeOfferError" />
    </p>
  ) : null;

  return (
    <Modal
      id="ListingPage.offerModal"
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
    >
      <div className={css.root}>
        <H3 className={css.heading}>
          {headingText ?? <FormattedMessage id="ListingPage.makeOfferModalHeading" />}
        </H3>
        {/* <p className={css.subHeading}>
          {subHeadingText ?? (
            <FormattedMessage
              id="ListingPage.makeOfferModalSubHeading"
              values={{ minAmount: `${minOfferAmount} ${price?.currency || ''}` }}
            />
          )}
        </p> */}

        <Form
          onSubmit={handleSubmit}
          validate={validate}
          initialValues={initialValues}
          render={({ handleSubmit: handleFormSubmit, submitting }) => (
            <form onSubmit={handleFormSubmit}>
              <FieldTextInput
                id="makeOfferAmount"
                name="offerAmount"
                type="number"
                className={css.inputWrapper}
                inputRootClass={css.input}
                labelClassName={css.inputLabel}
                label={intl.formatMessage(
                  { id: 'ListingPage.makeOfferAmountLabel' },
                  { currency: price?.currency }
                )}
                placeholder={
                  placeholder ??
                  intl.formatMessage(
                    { id: 'ListingPage.makeOfferAmountPlaceholder' },
                    { minAmount: minOfferAmount }
                  )
                }
                min={minOfferAmount}
                step="1"
              />
              <PrimaryButton
                className={css.submitButton}
                type="submit"
                disabled={submitting || inProgress}
                inProgress={inProgress}
              >
                {submitText ?? <FormattedMessage id="ListingPage.makeOfferSubmit" />}
              </PrimaryButton>
              {errorMessage}
            </form>
          )}
        />
      </div>
    </Modal>
  );
};

export default MakeOfferModal;
