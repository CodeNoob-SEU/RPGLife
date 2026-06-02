/** OTA 检查结果（结构与 domain/update/decide 的 OtaInput 一致）。 */
export interface OtaResult { enabled: boolean; available: boolean; error?: string; }
/** APK 检查结果（结构与 domain/update/decide 的 ApkInput 一致）。 */
export interface ApkResult { available: boolean; latestVersion?: string; url?: string; notes?: string; error?: string; }
