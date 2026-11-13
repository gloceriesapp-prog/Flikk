const fs = require('node:fs/promises');
const path = require('node:path');
const { withDangerousMod } = require('@expo/config-plugins');
const MARKER = '// Gloceries merchant-owned UPI processing';
function configureMerchantUpi(contents) {
  if (contents.includes(MARKER)) return contents;
  const anchor = '[self setupPaymentWindowPresenting:![self isApplePayRequested:options]];';
  if (!contents.includes(anchor) || !contents.includes('RCT_EXPORT_METHOD(open : (NSDictionary *)options)')) throw new Error('Unsupported Custom UPI native bridge; review the pinned SDK before building.');
  const setup = `${MARKER}
        BOOL merchantUpiIntent = [options[@"method"] isEqual:@"upi"] && [options[@"_[flow]"] isEqual:@"intent"];
        [self setupPaymentWindowPresenting:![self isApplePayRequested:options] && !merchantUpiIntent];`;
  const dismiss = `
RCT_EXPORT_METHOD(dismissGloceriesUpi) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [RazorpayEventEmitterCustom onPaymentError:1 description:@"Payment status continues in Gloceries" andData:[NSMutableDictionary dictionary]];
        [razorpay close];
        [self close];
    });
}

`;
  return contents.replace(anchor, setup).replace('RCT_EXPORT_METHOD(open : (NSDictionary *)options)', dismiss + 'RCT_EXPORT_METHOD(open : (NSDictionary *)options)');
}
module.exports = config => withDangerousMod(config, ['ios', async mod => {
  const packageFile = require.resolve('react-native-customui/package.json', { paths: [mod.modRequest.projectRoot] });
  const file = path.join(path.dirname(packageFile), 'ios', 'RazorpayCustomui.m');
  await fs.writeFile(file, configureMerchantUpi(await fs.readFile(file, 'utf8')));
  return mod;
}]);
module.exports.configureMerchantUpi = configureMerchantUpi;
