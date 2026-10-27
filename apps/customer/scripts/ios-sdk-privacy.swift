import Foundation

// Apple's documented NSPrivacyCollectedDataType values. Fail on unknown values
// rather than dropping a collection declaration to make validation pass.
let dataTypes = Set([
    "Name", "EmailAddress", "PhoneNumber", "PhysicalAddress", "OtherUserContactInfo",
    "Health", "Fitness", "PaymentInfo", "CreditInfo", "OtherFinancialInfo",
    "PreciseLocation", "CoarseLocation", "SensitiveInfo", "Contacts", "EmailsOrTextMessages",
    "PhotosorVideos", "AudioData", "GameplayContent", "CustomerSupport", "OtherUserContent",
    "BrowsingHistory", "SearchHistory", "UserID", "DeviceID", "PurchaseHistory",
    "ProductInteraction", "AdvertisingData", "OtherUsageData", "CrashData", "PerformanceData",
    "OtherDiagnosticData", "EnvironmentScanning", "Hands", "Head", "OtherDataTypes"
].map { "NSPrivacyCollectedDataType" + $0 })

enum PrivacyError: Error { case invalidManifest(String), invalidArguments }

func checked(_ original: [String: Any], normalizeRazorpay: Bool) throws -> ([String: Any], Bool) {
    var result = original
    guard let raw = result["NSPrivacyCollectedDataTypes"] else { return (result, false) }
    guard var entries = raw as? [[String: Any]] else { throw PrivacyError.invalidManifest("Invalid data array") }
    var changed = false
    for index in entries.indices {
        // RazorpayStandard 1.5.3 and the upstream 1.5.9 manifest spell this value
        // as a human label. Correct only the identifier; retain every purpose,
        // linkage flag, tracking flag and other declaration unchanged.
        if normalizeRazorpay && entries[index]["NSPrivacyCollectedDataType"] as? String == "Email address" {
            entries[index]["NSPrivacyCollectedDataType"] = "NSPrivacyCollectedDataTypeEmailAddress"
            changed = true
        }
        guard let type = entries[index]["NSPrivacyCollectedDataType"] as? String, dataTypes.contains(type) else {
            throw PrivacyError.invalidManifest("Unknown collected data type")
        }
    }
    result["NSPrivacyCollectedDataTypes"] = entries
    return (result, changed)
}

func selfTest() throws {
    let entry: [String: Any] = ["NSPrivacyCollectedDataType": "Email address",
        "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false,
        "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAnalytics"]]
    let original: [String: Any] = ["NSPrivacyCollectedDataTypes": [entry], "NSPrivacyTracking": false]
    var expectedEntry = entry
    expectedEntry["NSPrivacyCollectedDataType"] = "NSPrivacyCollectedDataTypeEmailAddress"
    let expected: [String: Any] = ["NSPrivacyCollectedDataTypes": [expectedEntry], "NSPrivacyTracking": false]
    let (fixed, changed) = try checked(original, normalizeRazorpay: true)
    precondition(changed && NSDictionary(dictionary: fixed).isEqual(to: expected))
    let (again, changedAgain) = try checked(fixed, normalizeRazorpay: true)
    precondition(!changedAgain && NSDictionary(dictionary: again).isEqual(to: expected))
    do {
        _ = try checked(original, normalizeRazorpay: false)
        throw PrivacyError.invalidManifest("Unknown values must be rejected")
    } catch PrivacyError.invalidManifest(let reason) {
        precondition(reason == "Unknown collected data type")
    }
    print("SDK privacy checks passed: preserve declarations, idempotent correction, reject unknown values.")
}

do {
    let args = Array(CommandLine.arguments.dropFirst())
    if args == ["--self-test"] { try selfTest() }
    else {
        guard args.count == 2, ["--normalize-razorpay", "--verify-bundle"].contains(args[0]) else {
            throw PrivacyError.invalidArguments
        }
        let root = URL(fileURLWithPath: args[1], isDirectory: true)
        guard FileManager.default.fileExists(atPath: root.path),
              let files = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil) else {
            throw PrivacyError.invalidManifest("Missing SDK or application directory")
        }
        var count = 0, corrections = 0
        for case let file as URL in files where file.lastPathComponent == "PrivacyInfo.xcprivacy" {
            let data = try Data(contentsOf: file)
            guard let manifest = try PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] else {
                throw PrivacyError.invalidManifest("Invalid property list")
            }
            let normalize = args[0] == "--normalize-razorpay"
                && file.path.hasSuffix("/RazorpayStandard.framework/PrivacyInfo.xcprivacy")
            let (validated, changed) = try checked(manifest, normalizeRazorpay: normalize)
            if changed {
                try PropertyListSerialization.data(fromPropertyList: validated, format: .xml, options: 0)
                    .write(to: file, options: .atomic)
                corrections += 1
            }
            count += 1
        }
        guard count > 0 else { throw PrivacyError.invalidManifest("No privacy manifests found") }
        print("Validated \(count) SDK privacy manifests; corrected \(corrections) known Razorpay labels.")
    }
} catch {
    fputs("iOS SDK privacy validation failed: \(error)\n", stderr)
    exit(1)
}
