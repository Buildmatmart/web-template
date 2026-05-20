import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import {
  LISTING_STATE_CLOSED,
  LISTING_STATE_DRAFT,
  LISTING_STATE_PENDING_APPROVAL,
  LISTING_STATE_PUBLISHED,
} from '../../../util/types';
import { isBookingProcessAlias } from '../../../transactions/transaction';

import { InlineTextButton, Menu, MenuContent, MenuItem, MenuLabel } from '../../../components';

import MenuIcon from './MenuIcon';
import css from './CardMenu.module.css';

const MENU_CONTENT_OFFSET = -12;
const MOBILE_MAX_WIDTH = 550;

const isOutOfStock = listing => {
  const state = listing?.attributes?.state;
  const publicData = listing?.attributes?.publicData;
  const isBookable = isBookingProcessAlias(publicData.transactionProcessAlias);
  const currentStock = listing?.currentStock?.attributes?.quantity;
  return !isBookable && currentStock === 0 && state === LISTING_STATE_PUBLISHED;
};

/**
 * Returns an array of menu item keys that are relevant for the given listing state.
 * If the array is empty, the menu should not be shown.
 *
 * @param {Object} listing - Listing entity (ownListing)
 * @returns {string[]} relevant menu item keys
 */
const getMenuItems = (listing, showSearchFeatured, showHomeFeatured) => {
  const state = listing?.attributes?.state;
  const isClosed = state === LISTING_STATE_CLOSED;
  const isDraft = state === LISTING_STATE_DRAFT;
  const isPendingApproval = state === LISTING_STATE_PENDING_APPROVAL;
  const { searchFeaturedScore, homeFeaturedScore } = listing?.attributes?.metadata || {};

  if (!listing || isDraft || isClosed || isPendingApproval || isOutOfStock(listing)) {
    return [];
  }

  const items = [];

  if (showSearchFeatured) {
    items.push(searchFeaturedScore ? 'remove-from-search' : 'feature-on-search');
  }

  if (showHomeFeatured) {
    items.push(homeFeaturedScore ? 'remove-from-home' : 'feature-on-home');
  }

  items.push('close-listing');
  return items;
};

/**
 * Card menu for manage listing card.
 * Only shows the "close listing" menu item for active listings at the moment.
 *
 * @param {Object} props
 * @param {boolean} props.isMenuOpen - Whether the menu is open
 * @param {Object} props.listing - The listing (own listing)
 * @param {Object} [props.inProgressListingId] - The actions in progress for the listing
 * @param {function} props.onToggleMenu - The function to toggle the menu
 * @param {function} props.onCloseListing - The function to close the listing
 * @param {function} props.onFeatureListing - The function to feature the listing on the search page
 * @param {function} props.onUnfeatureListing - The function to remove the listing from the search page
 * @param {boolean} [props.showSearchFeatured] - Whether the search featured option is available
 * @returns {JSX.Element|null}
 */
const CardMenu = props => {
  const {
    isMenuOpen,
    listing,
    inProgressListingId,
    onToggleMenu,
    onCloseListing,
    onFeatureListing,
    onUnfeatureListing,
    showSearchFeatured,
    showHomeFeatured,
  } = props;
  const intl = useIntl();
  const menuItems = getMenuItems(listing, showSearchFeatured, showHomeFeatured);

  if (menuItems.length === 0) {
    return null;
  }

  const menuItemClasses = classNames(css.menuItem, {
    [css.menuItemDisabled]: !!inProgressListingId,
  });
  const menuItemActionClasses = classNames(css.menuItem, css.menuItemAction, {
    [css.menuItemDisabled]: !!inProgressListingId,
  });

  return (
    <div className={css.menubarWrapper}>
      <div className={css.menubarGradient} />
      <div className={css.menubar}>
        <Menu
          contentPlacementOffset={MENU_CONTENT_OFFSET}
          mobileMaxWidth={MOBILE_MAX_WIDTH}
          contentPosition="left"
          useArrow={false}
          onToggleActive={isOpen => {
            const listingOpen = isOpen ? listing : null;
            onToggleMenu(listingOpen);
          }}
          isOpen={isMenuOpen}
        >
          <MenuLabel
            className={css.menuLabel}
            isOpenClassName={css.listingMenuIsOpen}
            ariaLabel={intl.formatMessage(
              {
                id: 'ManageListingCard.screenreader.menu',
              },
              { title: listing.attributes.title }
            )}
          >
            <div className={css.iconWrapper}>
              <MenuIcon className={css.menuIcon} isActive={isMenuOpen} />
            </div>
          </MenuLabel>
          <MenuContent rootClassName={css.menuContent}>
            {menuItems.map(itemKey => {
              if (itemKey === 'remove-from-search' || itemKey === 'feature-on-search') {
                return (
                  <MenuItem key={itemKey}>
                    <InlineTextButton
                      rootClassName={
                        itemKey === 'remove-from-search' ? menuItemClasses : menuItemActionClasses
                      }
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!inProgressListingId) {
                          onToggleMenu(null);

                          if (itemKey === 'remove-from-search') {
                            onUnfeatureListing(listing.id, false, 'search');
                          } else {
                            onFeatureListing(listing.id, true, 'search');
                          }
                        }
                      }}
                    >
                      {itemKey === 'remove-from-search' ? (
                        <FormattedMessage id="ManageListingCard.removeFromSearchPage" />
                      ) : (
                        <FormattedMessage id="ManageListingCard.featureOnSearchPage" />
                      )}
                    </InlineTextButton>
                  </MenuItem>
                );
              }

              if (itemKey === 'remove-from-home' || itemKey === 'feature-on-home') {
                return (
                  <MenuItem key={itemKey}>
                    <InlineTextButton
                      rootClassName={
                        itemKey === 'remove-from-home' ? menuItemClasses : menuItemActionClasses
                      }
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!inProgressListingId) {
                          onToggleMenu(null);

                          if (itemKey === 'remove-from-home') {
                            onUnfeatureListing(listing.id, false, 'home');
                          } else {
                            onFeatureListing(listing.id, true, 'home');
                          }
                        }
                      }}
                    >
                      {itemKey === 'remove-from-home' ? (
                        <FormattedMessage id="ManageListingCard.removeFromHomePage" />
                      ) : (
                        <FormattedMessage id="ManageListingCard.featureOnHomePage" />
                      )}
                    </InlineTextButton>
                  </MenuItem>
                );
              }

              if (itemKey === 'close-listing') {
                return (
                  <MenuItem key={itemKey}>
                    <InlineTextButton
                      rootClassName={menuItemClasses}
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!inProgressListingId) {
                          onToggleMenu(null);
                          onCloseListing(listing.id);
                        }
                      }}
                    >
                      <FormattedMessage id="ManageListingCard.closeListing" />
                    </InlineTextButton>
                  </MenuItem>
                );
              }

              return null;
            })}
          </MenuContent>
        </Menu>
      </div>
    </div>
  );
};

export default CardMenu;
