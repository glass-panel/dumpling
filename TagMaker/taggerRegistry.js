import * as fs from "fs/promises";
import { ScriptRegistry } from "../libs/ScriptRegistry.js";

const taggerRegistry = new ScriptRegistry();

const script_path = "./TagMaker/taggers";

async function loadTaggers() {
    const tagger_list = await fs.readdir(script_path);
    await Promise.all(tagger_list.map(async i=> {
        const tagger = await import(`../${script_path}/${i}`);
        taggerRegistry.registerScript(tagger.default);
        console.log(`// tagger ${tagger.default.name} loaded`);
    }));
}

export {
    taggerRegistry,
    loadTaggers,
};