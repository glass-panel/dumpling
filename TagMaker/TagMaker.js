import { Transform } from "stream";
//import { ScanData } from "../libs/typedef.js";

import { taggerRegistry } from "./taggerRegistry.js";
import * as util from "../libs/util.js";


class TagMaker extends Transform {
    constructor(feedback_counter, options) {
        super({ objectMode: true });
        this.feedback_counter = feedback_counter;
        this.errorHandler = options?.errorHandler || this.errorHandler;
    }
    
    feedback_counter = null;
    errorHandler = () => {};

    /** @param {{scan_data:ScanData, response:Buffer}} _ */
    async _transform({ scan_data, response }, encoding, callback) {
        const new_scan_data = util.structuredClone(scan_data);
        this.feedback_counter.inc();
            
        //console.log(scan_data, response?.toString('ascii'));
        if(!scan_data || scan_data.done || !response || response?.length == 0) {
            this.feedback_counter.dec();
            return callback(null, new_scan_data);
        }   
            
        const full_taggers = taggerRegistry.querySubset(scan_data.tags)
        const taggers = full_taggers
            .filter(i=> i.priority >= 0); // for tagger, negative priority means it handles those response that cannot be tagged by other taggers
        console.log(
            `for ${scan_data.host_info.ip}:${scan_data.host_info.port}, ${scan_data.tags.join(';')} found ${taggers.map(i=>i.name).join(';')} taggers`
        );
        
        if(taggers.length == 0) {
            const fallback_taggers = full_taggers.filter(i=> i.priority < 0);
            await Promise.all(fallback_taggers.map(async tagger => {
                await tagger.run(response, new_scan_data).catch((err)=> {
                    this.errorHandler(err, tagger);
                });
            }));
        } else {
            await Promise.all(taggers.map(async (tagger)=> {
                console.log(`running tagger ${tagger.name} for ${scan_data.host_info.ip}:${scan_data.host_info.port}`);
                const tags = await tagger.run(response, new_scan_data)
                    .catch((err)=>{ 
                        this.errorHandler(err, tagger);
                        return [];
                    });
                console.log(`tagger ${tagger.name} for ${scan_data.host_info.ip}:${scan_data.host_info.port} returned ${tags.join(';')}`);
                new_scan_data.tags = util.mergeTags(new_scan_data.tags, tags);
            }));
        }

        this.feedback_counter.dec();
        this.push(new_scan_data);
        callback();
    }
};

export {
    TagMaker,
};