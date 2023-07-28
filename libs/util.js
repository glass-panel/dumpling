import * as Stream from "stream"
import * as crypto from "crypto"

/**
 * @template T
 * @param {T} obj
 * @returns {T}
 */
function structuredClone(obj) {
    switch(typeof obj) {
    case "object":
        if(obj === null)
            return null;
        if(Array.isArray(obj))
            return obj.map(item=> structuredClone(item));
        if(obj instanceof Date)
            return new Date(obj);
        return Object.fromEntries(Object.entries(obj).map(([key, value])=> [key, structuredClone(value)]));
    default:
        return obj;
    }
}

async function sleep(ms, abort=undefined) {
    return new Promise((resolve, reject) => {
        let timer = setTimeout(()=> {
            resolve();
        }, ms);
        if(abort)
            abort.then(()=> {
                clearTimeout(timer);
                resolve();
            });
    });
}

/** @param {string} ip */
function ipv4ToInteger(ip) {
    return ip.split(".")
        .map(part=> parseInt(part))
        .reduce((accu, curr)=> ((accu << 8) + curr), 0);
}

/** @param {number} integer */
function integerToIpv4(integer) {
    return [0, 8, 16, 24].map(shift=> (integer >> shift) & 0xff)
        .reverse().join(".");
}

/** @param {Stream.Readable} stream @param {number} size @param {number} timeout @return {Promise<Buffer>} */
async function read(stream, size, timeout=0) {
    return new Promise((resolve, reject) => {
        let buffer = Buffer.alloc(size);
        let offset = 0;
        let timer = undefined;
        const ondata = (chunk)=> {
            clearTimeout(timer);
            chunk.copy(buffer, offset);
            offset += chunk.length;
        };
        const onend = () => {
            clearTimeout(timer);
            resolve(buffer);
        };
        stream.on("error", onend);
        stream.on("data", ondata);
        stream.on("end", onend);
        if(timeout > 0)
            timer = setTimeout(()=> {
                stream.removeListener("data", ondata);
                stream.removeListener("end", onend);
                stream.removeListener("error", onend);
                resolve(buffer);
            }, timeout);
    });
}

/** @param {Stream.Readable} stream @param {Buffer|string} patten @param {number} timeout @return {Promise<Buffer>} */
async function readUntil(stream, patten, timeout=0) {
    return new Promise((resolve, reject) => {
        let buffer = Buffer.alloc(0);
        let timer = undefined;
        const ondata = (chunk)=> {
            clearTimeout(timer);
            buffer = Buffer.concat([buffer, chunk]);
            if(buffer.indexOf(patten) >= 0) {
                cleanup();
                resolve(buffer);
            }
        };
        const onend = () => {
            clearTimeout(timer);
            resolve(buffer);
        };
        stream.on("error", onend);
        stream.on("data", ondata);
        stream.on("end", onend);
        if(timeout > 0)
            timer = setTimeout(()=> {
                stream.removeListener("data", ondata);
                stream.removeListener("end", onend);
                stream.removeListener("error", onend);
                resolve(buffer);
            }, timeout);
    });
}

/** @param {Stream.Readable} stream @param {number} idle_window @return {Promise<Buffer>} */
async function readUntilIdle(stream, idle_window, timeout=0) {
    return new Promise((resolve, reject) => {
        let buffer = Buffer.alloc(0);
        let timer = undefined;
        let idle_timer = undefined;
        const cleanup = ()=> {
            process.nextTick(()=> {
                stream.removeListener("data", ondata);
                stream.removeListener("end", onend);
                stream.removeListener("error", onend);
                clearTimeout(timer);
                clearTimeout(idle_timer);
            });
        };
        const ondata = (chunk)=> {
            clearTimeout(idle_timer);
            buffer = Buffer.concat([buffer, chunk]);
            idle_timer = setTimeout(()=> {
                cleanup();
                resolve(buffer);
            }, idle_window);
        };
        const onend = () => {
            cleanup();
            resolve(buffer);
        };
        stream.on("error", onend);
        stream.on("data", ondata);
        stream.on("end", onend);
        if(timeout > 0)
            timer = setTimeout(()=> {
                cleanup();
                resolve(buffer);
            }, timeout);
    });
}

/** @param {Buffer} buffer */
function hash(buffer) {
    return crypto.createHash("sha256").update(buffer).digest();
} 

/** @param {string[]} target @param {string[]} source */
function mergeTags(target, source) {
    const result = new Set(target);
    source.forEach(i=>result.add(i));
    return Array.from(result);
}

/** @param {string} cidr */
function ipv4CIDRToRange(cidr) {
    const base = cidr.split("/")[0];
    const mask = parseInt(cidr.split("/")[1]);
    const base_int = ipv4ToInteger(base);
    const mask_int = 0xffffffff << (32 - mask);
    const start_int = base_int & mask_int;
    const end_int = base_int | (0xffffffff & ~mask_int);
    return Array.from({length: end_int - start_int + 1}, (_, i)=> integerToIpv4(start_int + i));
}

export {
    structuredClone,
    sleep,
    ipv4ToInteger,
    integerToIpv4,
    read,
    readUntil,
    readUntilIdle,
    hash,
    mergeTags,
    ipv4CIDRToRange
};