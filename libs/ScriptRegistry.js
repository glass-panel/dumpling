import * as crypto from "crypto";
//import { Script } from "./typedef.js";

function count1(n) {
    let count = 0;
    while(n) {
        n &= n-1n;
        count++;
    }
    return count;
}

class ScriptRegistry {
    constructor() {}

    /** @type {Script[]} */
    scripts = [];
    /** @type {string[]} */
    tag_list = [];
    /** @type {Map<string, BigInt>} */
    tag_mask_map = new Map();

    addTag(tag) {
        if(this.tag_mask_map.has(tag))
            return;
        this.tag_list.push(tag);
        this.tag_mask_map.set(tag, BigInt(1) << BigInt(this.tag_list.length-1));
    }

    /** @param {Script} script */
    registerScript(script) {
        if(!script.id)
            script.id = crypto.randomUUID();
        if(this.scripts.findIndex(p=> p.id === script.id) === -1) {
            if(script.priority === undefined)
                script.priority = 0;
            script.tags.forEach(i=> this.addTag(i));
            script.tag_mask = script.tags.reduce((acc, cur)=> acc | this.tag_mask_map.get(cur), BigInt(0));
            this.scripts.push(script);
        }
        return script.id;
    } 

    /** @param {string} id */
    getScript(id) {
        return this.scripts.find(p=> p.id === id);
    }

    /** @param {string[]} tags */
    querySubset(tags, sort=true) {
        const subtract_list = tags.filter(i=> !this.tag_mask_map.has(i));
        const union_map = new Map(this.tag_mask_map);
        subtract_list.forEach((i, n)=> {
            union_map.set(i, BigInt(1) << BigInt(this.tag_list.length+n));
        });
        const mask = tags.reduce((acc, cur)=> acc | union_map.get(cur), BigInt(0));
        const subset = this.scripts.filter(i=> (i.tag_mask & mask) === i.tag_mask);
        if(sort)
            subset.sort((a, b)=> {  // sort by count1(tag_mask) the similarity of tags, then by priority, greater first
                if(a.tag_mask === b.tag_mask)
                    return b.priority - a.priority;
                return count1(b.tag_mask) - count1(a.tag_mask);
            });
        return subset;
    }
};

export {
    ScriptRegistry,
};