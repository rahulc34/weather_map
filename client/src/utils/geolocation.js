/**
 * Promise wrapper around the browser Geolocation API with i18n-ready errors.
 */

const PERMISSION_DENIED = 1;
const GEO_OPTIONS = Object.freeze({
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 10 * 60 * 1000,
});

/**
 * Error carrying the i18n key of the message to show.
 * @param {string} i18nKey
 * @returns {Error & { i18nKey: string }} error
 */
const geoError = (i18nKey) => Object.assign(new Error(i18nKey), { i18nKey });

/**
 * Ask the browser for the user's approximate position.
 * @returns {Promise<{ lat: number, lon: number }>} coordinates
 * @throws {Error & { i18nKey: string }} when unsupported, denied or unavailable
 */
export function getCurrentCoords() {
  if (!('geolocation' in navigator)) {
    return Promise.reject(geoError('location.geoUnsupported'));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
      (err) =>
        reject(
          geoError(
            err.code === PERMISSION_DENIED ? 'location.geoDenied' : 'location.geoUnavailable',
          ),
        ),
      GEO_OPTIONS,
    );
  });
}
