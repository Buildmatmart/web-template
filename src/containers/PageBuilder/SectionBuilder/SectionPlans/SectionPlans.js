import React, { useState } from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';

import Field, { hasDataInFields } from '../../Field';
import { NamedLink } from '../../../../components';
import { createBillingPortalSession } from '../../../../util/api';
import SectionContainer from '../SectionContainer';
import css from './SectionPlans.module.css';

const STRIPE_PRO_LINK = process.env.REACT_APP_STRIPE_PRO_PAYMENT_LINK;
const STRIPE_ELITE_LINK = process.env.REACT_APP_STRIPE_ELITE_PAYMENT_LINK;
const STRIPE_BUSINESS_LINK = process.env.REACT_APP_STRIPE_BUSINESS_PAYMENT_LINK;

/**
 * Builds a Stripe payment link with prefilled user params.
 */
const buildStripeLink = (baseLink, userEmail, userId) => {
  if (!baseLink) return null;
  const params = new URLSearchParams({
    prefilled_email: userEmail,
    client_reference_id: userId,
  });
  return `${baseLink}?${params.toString()}`;
};

/**
 * @typedef {Object} FieldComponentConfig
 * @property {ReactNode} component
 * @property {Function} pickValidProps
 */

/**
 * Custom section component for rendering pricing plan cards.
 * Keeps standard SectionContainer + header fields, but replaces block rendering
 * with custom plan card layout and CTA buttons.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {Object} props.defaultClasses
 * @param {string} props.sectionId id of the section
 * @param {Object?} props.title
 * @param {Object?} props.description
 * @param {Object?} props.appearance
 * @param {Object?} props.callToAction
 * @param {Array} props.blocks array of block configs
 * @param {boolean?} props.isInsideContainer
 * @param {Object} props.options extra options for the section component
 * @param {Object<string,FieldComponentConfig>?} props.options.fieldComponents custom fields
 * @returns {JSX.Element} Pricing plans section
 */
const SectionPlans = props => {
  const intl = useIntl();
  const [portalLoading, setPortalLoading] = useState(false);
  const { currentUser } = useSelector(state => state.user);
  const isAuthenticated = !!currentUser;
  const {
    sectionId,
    className,
    rootClassName,
    defaultClasses,
    title,
    description,
    appearance,
    callToAction,
    blocks = [],
    isInsideContainer = false,
    options,
  } = props;

  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };

  const hasHeaderFields = hasDataInFields([title, description, callToAction], fieldOptions);
  const hasBlocks = blocks?.length > 0;

  const userId = currentUser?.id?.uuid || '';
  const userEmail = currentUser?.attributes?.email || '';
  const { subscriptionPlan } = currentUser?.attributes?.profile?.metadata || {};

  const proLink = buildStripeLink(STRIPE_PRO_LINK, userEmail, userId);
  const eliteLink = buildStripeLink(STRIPE_ELITE_LINK, userEmail, userId);
  const businessLink = buildStripeLink(STRIPE_BUSINESS_LINK, userEmail, userId);

  const stripeLinkByBlockId = {
    pro: proLink,
    elite: eliteLink,
    business: businessLink,
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const data = await createBillingPortalSession();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('Failed to open billing portal', e);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <SectionContainer
      id={sectionId}
      className={className}
      rootClassName={rootClassName}
      appearance={appearance}
      options={fieldOptions}
    >
      {hasHeaderFields ? (
        <header className={defaultClasses.sectionDetails}>
          <Field data={title} className={defaultClasses.title} options={fieldOptions} />
          <Field data={description} className={defaultClasses.description} options={fieldOptions} />
          <Field data={callToAction} className={defaultClasses.ctaButton} options={fieldOptions} />
        </header>
      ) : null}

      {hasBlocks ? (
        <div
          className={classNames(css.plansGrid, {
            [css.noSidePaddings]: isInsideContainer,
          })}
        >
          {blocks.map((block, index) => {
            const blockId = block.blockId || `${sectionId}-block-${index + 1}`;
            const { title: blockTitle, text, callToAction: blockCta } = block;

            const isActivePlan = subscriptionPlan === blockId;
            const stripeLink = stripeLinkByBlockId[blockId];
            const ctaLabel = blockCta?.content;

            return (
              <div
                key={`${blockId}_i${index}`}
                className={classNames(css.planCard, { [css.planCardActive]: isActivePlan })}
                id={blockId}
              >
                {isActivePlan ? (
                  <div className={css.activeBadge}>
                    {intl.formatMessage({ id: 'SectionPlans.activePlan' })}
                  </div>
                ) : null}

                <div className={css.planContent}>
                  {blockTitle ? (
                    <Field data={blockTitle} className={css.planName} options={fieldOptions} />
                  ) : null}

                  {text ? (
                    <Field data={text} className={css.planDetails} options={fieldOptions} />
                  ) : null}
                </div>

                {ctaLabel || isActivePlan ? (
                  <div className={css.planCtaWrapper}>
                    {isActivePlan ? (
                      <button
                        className={css.planCta}
                        onClick={handleManageSubscription}
                        disabled={portalLoading}
                      >
                        {portalLoading
                          ? intl.formatMessage({ id: 'SectionPlans.manageSubscriptionLoading' })
                          : intl.formatMessage({ id: 'SectionPlans.manageSubscription' })}
                      </button>
                    ) : isAuthenticated ? (
                      <button
                        className={css.planCta}
                        onClick={() => {
                          if (stripeLink) {
                            window.location.href = stripeLink;
                          }
                        }}
                      >
                        {ctaLabel}
                      </button>
                    ) : (
                      <NamedLink
                        name="LoginPage"
                        to={{ state: { from: '/p/pricing' } }}
                        className={css.planCta}
                      >
                        {ctaLabel}
                      </NamedLink>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </SectionContainer>
  );
};

export default SectionPlans;
