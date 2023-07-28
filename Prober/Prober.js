import { Readable, Transform } from "stream";

import * as util from "../libs/util.js"
import { probeRegistry } from "./probeRegistry.js";
//import { ScanData } from "../libs/typedef.js";
import { AsyncRunner } from "../libs/AsyncRunner.js";

class Prober extends Transform {
    /** @param {AsyncRunner} runner */
    constructor(feedback_counter, runner, options) {
        super({ objectMode: true });
        this.feedback_counter = feedback_counter;
        this.runner = runner || new AsyncRunner(0);
        this.errorHandler = options?.errorHandler || this.errorHandler;
    }

    /** @type {AsyncRunner} */
    runner = null;
    feedback_counter = null;
    errorHandler = () => {};
    /** @type {Map<string, Set<string>>} */
    logs = new Map();

    /** @param {ScanData} scan_data */
    async _transform(scan_data, encoding, callback) {
        try {
            //console.log(scan_data);
            
            if(scan_data.done) {
                this.feedback_counter.inc();
                this.feedback_counter.dec();
                return callback(null, { scan_data: util.structuredClone(scan_data), response: null });
            }
                
            const host_str = `${scan_data.host_info.ip}:${scan_data.host_info.port}`;
            const log = this.logs.get(host_str) || new Set();
            const probes = probeRegistry.querySubset(scan_data.tags).filter(i=> {
                return !log || !log.has(i.id);
            }); // filter out already runned probes
            console.log(`for ${host_str}, found ${probes.map(i=>i.name).join(';')} probes`)
            if(probes.length === 0) {
                scan_data.done = true;
                this.feedback_counter.inc();
                this.feedback_counter.dec();
                return callback(null, { scan_data: util.structuredClone(scan_data), response: null });
            }

            probes.forEach(probe=> log.add(probe.id));
            this.logs.set(host_str, log);
            await Promise.all(probes.map(async (probe)=> {
                console.log(`  running probe: ${probe.name} on ${host_str} runner: `, this.runner.running);
                const new_scan_data = util.structuredClone(scan_data);
                await this.runner.runAsync(async ()=>{
                    this.feedback_counter.inc();
                    await probe.run(new_scan_data)
                        .then((response)=> {
                            this.push({ scan_data: new_scan_data, response });
                        })
                        .catch((err)=> {
                            this.errorHandler(err, probe)
                            this.push({ scan_data: null, response: null });
                        })
                        .finally(()=> {    
                            console.log(`  probe ${probe.name} on ${host_str} done`);
                        });
                }, scan_data); 
            })); // for each probe, run it then push the result to the stream
        } catch(err) {
            console.log("ProberInner: ", err);
        }
        this.feedback_counter.dec();
        callback();
    }
};

export {
    Prober
};