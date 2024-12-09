import fs from 'fs';
import path from 'path';

// Function to convert a string to camelCase
function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
      index === 0 ? match.toUpperCase() : match.toLowerCase(),
    )
    .replace(/\s+/g, '');
}

// Define types for the templates
type Templates = {
  interface: string;
  model: string;
  controller: string;
  service: string;
  route: string;
  validation: string;
  constants: string;
};

// Function to create a module with files and starter code
function createModule(name: string): void {
  const camelCaseName = toCamelCase(name);
  const folderName = camelCaseName.toLowerCase(); // Use camelCase for folder
  const folderPath = path.join(__dirname, 'app', 'modules', folderName);

  // Check if the folder already exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
    console.log(`Created folder: ${folderName}`);
  } else {
    console.log(`Folder ${folderName} already exists.`);
    return;
  }

  // Templates with dynamic insertion of the module name in camelCase
  const templates: Templates = {
    interface: `import { Model } from 'mongoose';\n\nexport type I${camelCaseName} = {\n  // Define the interface for ${camelCaseName} here\n};\n\nexport type ${camelCaseName}Model = Model<I${camelCaseName}>;\n`,
    model: `import { Schema, model } from 'mongoose';\nimport { I${camelCaseName}, ${camelCaseName}Model } from './${folderName}.interface'; \n\nconst ${folderName}Schema = new Schema<I${camelCaseName}, ${camelCaseName}Model>({\n  // Define schema fields here\n});\n\nexport const ${camelCaseName} = model<I${camelCaseName}, ${camelCaseName}Model>('${camelCaseName}', ${folderName}Schema);\n`,
    controller: `import { Request, Response, NextFunction } from 'express';\nimport { ${camelCaseName}Services } from './${folderName}.service';\n\nexport const ${camelCaseName}Controller = { };\n`,
    service: `import { ${camelCaseName}Model } from './${folderName}.interface';\n\nexport const ${camelCaseName}Services = { };\n`,
    route: `import express from 'express';\nimport { ${camelCaseName}Controller } from './${folderName}.controller';\n\nconst router = express.Router();\n\nrouter.get('/', ${camelCaseName}Controller); \n\nexport const ${camelCaseName}Routes = router;\n`,
    validation: `import { z } from 'zod';\n\nexport const ${camelCaseName}Validations = {  };\n`,
    constants: `export const ${camelCaseName.toUpperCase()}_CONSTANT = 'someValue';\n`,
  };

  // Create each file with corresponding template content
  Object.entries(templates).forEach(([key, content]) => {
    const filePath = path.join(folderPath, `${folderName}.${key}.ts`);
    fs.writeFileSync(filePath, content);
    console.log(`Created file: ${filePath}`);
  });
}

// Get the module name from command line arguments
const moduleName: string | undefined = process.argv[2];
if (!moduleName) {
  console.log(
    'Please provide a module name, e.g., node generateModule UserProfile',
  );
} else {
  createModule(moduleName);
}
