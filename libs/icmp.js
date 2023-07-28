//import ICMP from 'icmp';
import * as pingp from 'ping';

/** @param {string} ip */
async function ping(ip) {
    const start = Date.now();
    const result = await pingp.default.promise.probe(ip);
    //const result = await ICMP.ping(ip).catch(err=> -1);
    const diff = Math.abs(Date.now() - start);
    return result.alive? diff : -1;
    //return result>=0? result : diff>0? diff : 0;
    return 500;
}

export {
    ping,
};