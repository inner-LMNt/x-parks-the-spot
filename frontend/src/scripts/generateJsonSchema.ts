// scripts/generateJsonSchema.ts

import * as tsj from 'typescript-json-schema';
import { resolve } from 'path';

export function generateJsonSchema(typeName: string): any {
    const settings: tsj.PartialArgs = {
        required: true,
        aliasRefs: true,
        noExtraProps: true,
        topRef: true,
        titles: true,
    };

    const compilerOptions: tsj.CompilerOptions = {
        strictNullChecks: true,
    };

    const program = tsj.getProgramFromFiles(
        [resolve('src/types/type.ts')],
        compilerOptions
    );

    const schema = tsj.generateSchema(program, typeName, settings);
    return schema;
}
