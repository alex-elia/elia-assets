/**
 * @typedef {object} IngestionArtifact
 * @property {string} version_id
 * @property {string} [work_id]
 * @property {string} text_body
 * @property {string} [content_hash]
 * @property {string} [language]
 * @property {object[]} [contributors]
 * @property {string} [rights_status]
 * @property {string} [rights_evidence]
 * @property {string} [source_locator]
 * @property {string} [observation_id]
 * @property {string} [bio_summary]
 * @property {string} [availability]
 */

/**
 * @typedef {object} QualityCheck
 * @property {string} id
 * @property {'block' | 'warn' | 'ok'} severity
 * @property {string} message
 */

/**
 * @typedef {object} AssessResult
 * @property {QualityCheck[]} checks
 * @property {number} deterministic_score
 * @property {boolean} has_block
 */

/**
 * @typedef {object} RedressePatch
 * @property {string} field
 * @property {unknown} value
 * @property {string} [reason]
 */

/**
 * @typedef {object} RedresseResult
 * @property {boolean} applied
 * @property {RedressePatch[]} patches
 * @property {string} [raw_model_json]
 * @property {string} [error]
 * @property {number} confidence
 */

/**
 * @typedef {object} SinanProfile
 * @property {string} profile_id
 * @property {string} profile_version
 * @property {number} publish_threshold
 * @property {number} review_threshold
 * @property {{ deterministic: number, redresse: number, schema: number }} weights
 * @property {string[]} allowed_redresse_fields
 * @property {string[]} deny_auto_publish_rights
 */

export {};
