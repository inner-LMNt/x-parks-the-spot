// src/scripts/writeMockData.ts

import { writeFileSync } from 'fs';
import { join } from 'path';

export function writeMockData(featureName: string, typeName: string, data: any[], dir: string) {
    const filePath = join(dir, `${featureName}Data.ts`);

    const helperFunctions = `
/**
 * Helper Functions for ${typeName}
 */

import { ${typeName} } from "@/types/type";
import { faker } from '@faker-js/faker';

// Function to generate a random ID
export const generateId = (): string => {
  return faker.datatype.uuid();
};

// Function to find an item by ID
export const find${typeName}ById = (id: string): ${typeName} | undefined => {
  return mock${typeName}s.find(item => item.id === id);
};

// Function to add a new item
export const add${typeName} = (item: ${typeName}): void => {
  mock${typeName}s.push(item);
};

// Function to update an item by ID
export const update${typeName}ById = (id: string, updates: Partial<${typeName}>): void => {
  const index = mock${typeName}s.findIndex(item => item.id === id);
  if (index !== -1) {
    mock${typeName}s[index] = { ...mock${typeName}s[index], ...updates };
  }
};
`;

    const fileContent = `// ${filePath}

import { ${typeName} } from "@/types/type";
import { faker } from '@faker-js/faker';

/**
 * Mock Data for ${typeName}
 */
export const mock${typeName}s: ${typeName}[] = ${JSON.stringify(data, null, 2)};

${helperFunctions}
`;

    writeFileSync(filePath, fileContent);
}
