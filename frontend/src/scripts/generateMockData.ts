// src/scripts/generateMockData.ts

import jsf from 'json-schema-faker';
import { generateJsonSchema } from './generateJsonSchema';
import { faker } from '@faker-js/faker';

jsf.extend('faker', () => faker);

jsf.option({
    useExamplesValue: true,
    alwaysFakeOptionals: true,
});

// Custom formats for latitude and longitude near West Lafayette
jsf.format('latitudeNearWestLafayette', () => {
    const min = 40.420869;
    const max = 40.430869;
    return faker.datatype.number({ min, max, precision: 0.000001 });
});

jsf.format('longitudeNearWestLafayette', () => {
    const min = -86.913066;
    const max = -86.903066;
    return faker.datatype.number({ min, max, precision: 0.000001 });
});

function adjustSchema(schema: any): any {
    if (schema.properties) {
        for (const key in schema.properties) {
            const property = schema.properties[key];
            if (key === 'latitude') {
                property.format = 'latitudeNearWestLafayette';
            } else if (key === 'longitude') {
                property.format = 'longitudeNearWestLafayette';
            } else if (property.type === 'object') {
                adjustSchema(property);
            } else if (property.type === 'array' && property.items) {
                adjustSchema(property.items);
            }
        }
    }
    return schema;
}

export function generateMockData(typeName: string, count: number): any[] {
    const schema = generateJsonSchema(typeName);
    const adjustedSchema = adjustSchema(schema);

    const data = [];
    for (let i = 0; i < count; i++) {
        const mock = jsf.generate(adjustedSchema);
        data.push(mock);
    }
    return data;
}
