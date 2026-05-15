import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../util/reactIntl';
import { isOriginInUse } from '../../../util/search';
import { parse } from '../../../util/urlHelpers';
import { createResourceLocatorString } from '../../../util/routes';
import { types as sdkTypes } from '../../../util/sdkLoader';
import { LocationAutocompleteInput } from '../../../components';

import { getSearchPageResourceLocatorStringParams } from '../SearchPage.shared';
import IconPlus from '../IconPlus/IconPlus';

import css from './LocationFilter.module.css';

const { LatLng: SDKLatLng, LatLngBounds: SDKLatLngBounds } = sdkTypes;

const KM_TO_METERS = 1000;
const DISTANCE_MIN = 1;
const DISTANCE_MAX = 200;
const DISTANCE_DEFAULT = 150;

const LocationFilter = props => {
  const { id, className, history, routeConfiguration, config, location, validQueryParams } = props;
  const intl = useIntl();

  const { address, origin, bounds } = parse(location.search, {
    latlng: ['origin'],
    latlngBounds: ['bounds'],
  });

  const makeLocationValue = (addr, orig, bnds) =>
    addr
      ? { search: addr, selectedPlace: { address: addr, origin: orig, bounds: bnds }, predictions: [] }
      : { search: '', predictions: [], selectedPlace: null };

  const [isOpen, setIsOpen] = useState(true);
  const [locationValue, setLocationValue] = useState(() => makeLocationValue(address, origin, bounds));
  const [distanceKm, setDistanceKm] = useState(DISTANCE_DEFAULT);

  // Sync when URL address changes externally (e.g. via the topbar search or browser back)
  const prevAddressRef = useRef(address);
  useEffect(() => {
    if (address !== prevAddressRef.current) {
      prevAddressRef.current = address;
      setLocationValue(makeLocationValue(address, origin, bounds));
    }
  }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = value => {
    setLocationValue(value);

    if (value?.selectedPlace) {
      const { search, selectedPlace } = value;
      const { bounds: newBounds, origin: newOrigin } = selectedPlace;
      const originMaybe = isOriginInUse(config) ? { origin: newOrigin } : {};

      const { routeName, pathParams } = getSearchPageResourceLocatorStringParams(
        routeConfiguration,
        location
      );
      const searchParams = {
        ...validQueryParams,
        address: search,
        bounds: newBounds,
        ...originMaybe,
      };
      history.push(createResourceLocatorString(routeName, routeConfiguration, pathParams, searchParams));
    }
  };

  const handleDistanceChange = e => {
    const km = Number(e.target.value);
    setDistanceKm(km);

    // If a location is already selected, recalculate bounds with the new distance
    if (origin && typeof window !== 'undefined' && window.mapboxgl) {
      const meters = km * KM_TO_METERS;
      const mboxBounds = new window.mapboxgl.LngLat(origin.lng, origin.lat).toBounds(meters);
      const newBounds = new SDKLatLngBounds(
        new SDKLatLng(mboxBounds.getNorth(), mboxBounds.getEast()),
        new SDKLatLng(mboxBounds.getSouth(), mboxBounds.getWest())
      );
      const originMaybe = isOriginInUse(config) ? { origin } : {};
      const { routeName, pathParams } = getSearchPageResourceLocatorStringParams(
        routeConfiguration,
        location
      );
      const searchParams = { ...validQueryParams, address, bounds: newBounds, ...originMaybe };
      history.push(createResourceLocatorString(routeName, routeConfiguration, pathParams, searchParams));
    }
  };

  const handleClear = () => {
    setLocationValue({ search: '', predictions: [], selectedPlace: null });
    const { bounds: _b, origin: _o, ...restParams } = validQueryParams;
    const { routeName, pathParams } = getSearchPageResourceLocatorStringParams(
      routeConfiguration,
      location
    );
    history.push(createResourceLocatorString(routeName, routeConfiguration, pathParams, restParams));
  };

  const hasValue = !!address;
  const label = intl.formatMessage({ id: 'LocationFilter.label' });

  return (
    <div className={classNames(css.root, className)}>
      <div className={css.filterHeader}>
        <button
          id={`${id}.toggle`}
          className={css.labelButton}
          onClick={() => setIsOpen(prev => !prev)}
          aria-expanded={isOpen}
        >
          <span className={css.labelButtonContent}>
            <span className={css.labelWrapper}>
              <span className={css.label}>{label}</span>
            </span>
            <span className={css.openSign}>
              <IconPlus isOpen={isOpen} isSelected={hasValue} />
            </span>
          </span>
        </button>
      </div>

      <div className={classNames(css.plain, { [css.isOpen]: isOpen })}>
        <LocationAutocompleteInput
          id={`${id}-input`}
          className={css.inputRoot}
          inputClassName={css.input}
          predictionsClassName={css.predictions}
          iconClassName={css.searchIcon}
          placeholder={intl.formatMessage({ id: 'LocationFilter.placeholder' })}
          closeOnBlur
          useDarkText
          input={{
            name: 'location-filter',
            value: locationValue,
            onChange: handleChange,
            onFocus: () => {},
            onBlur: () => {},
          }}
          meta={{ valid: true, touched: false }}
          typeLimit={['locality', 'neighborhood']}
          boundsDistance={distanceKm * KM_TO_METERS}
        />
        <div className={css.distanceWrapper}>
          <div className={css.distanceLabel}>
            {intl.formatMessage({ id: 'LocationFilter.distanceLabel' }, { km: distanceKm })}
          </div>
          <input
            type="range"
            min={DISTANCE_MIN}
            max={DISTANCE_MAX}
            value={distanceKm}
            onChange={handleDistanceChange}
            className={css.distanceSlider}
          />
          <div className={css.distanceRange}>
            <span>{DISTANCE_MIN} km</span>
            <span>{DISTANCE_MAX} km</span>
          </div>
        </div>
        {hasValue ? (
          <button type="button" className={css.clearButton} onClick={handleClear}>
            {intl.formatMessage({ id: 'FilterPlain.clear' })}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default LocationFilter;
