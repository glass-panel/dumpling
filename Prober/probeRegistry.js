import * as fs from "fs/promises";

import { ScriptRegistry } from "../libs/ScriptRegistry.js";

const probeRegistry = new ScriptRegistry();

const script_path = "./Prober/probes";

async function loadProbes() {
    const probe_list = await fs.readdir(script_path);
    console.log(probe_list);
    await Promise.all(probe_list.map(async i=> {
        const probe = await import(`../${script_path}/${i}`);
        probeRegistry.registerScript(probe.default);
        console.log(`// probe ${probe.default.name} loaded`);
    }));
}

export {
    probeRegistry,
    loadProbes,
};
