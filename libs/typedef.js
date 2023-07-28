
/** 
 * @typedef HostInfo
 * @property {string} ip
 * @property {number} port
 * @property {number} latency
 */

/**
 * @typedef ScanData
 * @property {HostInfo} host_info
 * @property {string[]} tags
 * @property {Object} extra
 * @property {bool} done
 */

/**
 * @typedef Script
 * @property {string} name
 * @property {string} description
 * @property {string} id
 * @property {string[]} tags
 * @property {number} priority
 * @property {BigInt} tag_mask
 * @property {(object)=>Promise<object>} run
 */

/** @typedef {Script} Probe  */
/** @typedef {Script} Tagger */

export {
    HostInfo,
    ScanData,
    Script,
    Probe,
    Tagger,
};