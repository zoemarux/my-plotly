/**
 * @see http://stackoverflow.com/a/3540295/2833319
 */
exports.wpIsIos = function wpIsIos(){
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
};
