const { test } = require('node:test');
const assert = require('node:assert/strict');
const { configureMerchantUpi } = require('./iosUpiMerchantUi.cjs');
test('suppresses only the SDK intent waiting window and installs controlled dismissal once', () => {
 const source = 'RCT_EXPORT_METHOD(open : (NSDictionary *)options) { [self setupPaymentWindowPresenting:![self isApplePayRequested:options]]; }';
 const result = configureMerchantUpi(source);
 assert.match(result, /@"method".*@"upi"/);
 assert.match(result, /@"_\[flow\]".*@"intent"/);
 assert.match(result, /!merchantUpiIntent/);
 assert.match(result, /RCT_EXPORT_METHOD\(dismissGloceriesUpi\)/);
 assert.doesNotMatch(result, /userCancelledPayment/);
 assert.equal(configureMerchantUpi(result), result);
 assert.throws(() => configureMerchantUpi('unknown SDK'), /Unsupported/);
});
