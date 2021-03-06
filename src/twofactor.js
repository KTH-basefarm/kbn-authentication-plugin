/**
 * @author Robin Duda
 *
 * Handles two-factor authentication using TOTP, generates
 * a qr-code or base32 string to represent the shared secret.
 *
 * Secrets are not bound to an username before it is verified
 * once, to ensure that the user has received the secret.
 */

const Speakeasy = require('speakeasy');
const QR = require('qr-image');
const Config = require('./config').load('two-factor');
var User = require('./model/users');

module.exports = {

  /**
   * Override the default data store.
   * 
   * @param store implements model/users.js
     */
  init: function (store) {
    this.User = store;
  },

  /**
   * Verifies a 2-FA key with the current timeframe and
   * the stored secret for the given user.
   *
   * @param username used to identify the correct secret.
   * @param token supplied by the authenticating party.
   * @param callback Function {success, secret}
     */
  verify: function (username, token, callback) {
    User.getSecret(username, function (exist, secret) {

      if (!exist) {
        callback(false, secret);
      } else {
        var success = Speakeasy.totp.verify({
            secret: secret.key,
            encoding: 'base32',
            token: token
          }
        );

        if (success) User.setVerified(username, true);

        callback(success, secret);
      }
    });
  },

  /**
   * Creates a new 2-FA secret for the given username.
   *
   * @param username to create the secret for.
   * @returns {{text: *, svg: *}}
     */
  create: function (username) {
    var key = Speakeasy.generateSecret({length: Config.length});
    User.create(username, key.base32);

    return {
      text: key.base32,
      svg: QR.imageSync(key.otpauth_url, {type: 'svg'})
    };
  },

  /**
   * Determines if an user has enabled its 2-FA secret by logging
   * in at least once.
   *
   * @param username specifies the user.
   * @param callback Function {Boolean}
     */
  enabled: function (username, callback) {
    User.getSecret(username, function (enabled, secret) {
      callback(enabled, secret);
    });
  },

  /**
   * Generates a new key from a given secret.
   *
   * @param key as the secret base32 encoded.
   * @returns {String} as a valid OTP.
     */
  generate: function (key) {
    return Speakeasy.totp({
      secret: key,
      encoding: 'base32'
    });
  }
};

