import fs from "fs";
import path from "path";

// Function to convert a string to camelCase
function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
      index === 0 ? match.toUpperCase() : match.toLowerCase()
    )
    .replace(/\s+/g, "");
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
  const folderPath = path.join(__dirname, folderName);

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
    validation: `import { zod } from 'zod';\n\nexport const ${camelCaseName}Validations = {  };\n`,
    constants: `export const ${camelCaseName.toUpperCase()}_CONSTANT = 'someValue';\n`,
  };

  // Create each file with corresponding template content
  Object.entries(templates).forEach(([key, content]) => {
    const filePath = path.join(folderPath, `${folderName}.${key}.ts`);
    fs.writeFileSync(filePath, content);
    console.log(`Created file: ${filePath}`);
  });

  // Update the central router file to include the new route
  updateCentralRouter(name);
}

// Function to update the central router file with new routes
function updateCentralRouter(moduleName: string): void {
  const folderName = toCamelCase(moduleName).toLowerCase();
  const centralRouterPath = path.join(__dirname, "router", "index.ts"); // Path to your central router file

  if (fs.existsSync(centralRouterPath)) {
    let centralRouterFile = fs.readFileSync(centralRouterPath, "utf-8");

    // Check if the route already exists to avoid duplication
    const routeImportStatement = `import { ${toCamelCase(
      folderName
    )}Routes } from '../app/modules/${folderName}/${folderName}.route';`;
    const routePushStatement = `\n  {\n    path: '/${folderName}',\n    route: ${toCamelCase(
      folderName
    )}Routes,\n  },`;

    if (!centralRouterFile.includes(routeImportStatement)) {
      // Add the import statement for the new route at the top
      centralRouterFile = `${routeImportStatement}\n` + centralRouterFile;
    }

    if (!centralRouterFile.includes(routePushStatement)) {
      // Add the new route to the apiRoutes array
      const apiRoutesIndex = centralRouterFile.indexOf("const apiRoutes = [");
      if (apiRoutesIndex !== -1) {
        const apiRoutesEndIndex = centralRouterFile.indexOf(
          "];",
          apiRoutesIndex
        );
        centralRouterFile =
          centralRouterFile.slice(0, apiRoutesEndIndex) +
          routePushStatement +
          centralRouterFile.slice(apiRoutesEndIndex);
      }
    }

    // Write the updated content back to the central router file
    fs.writeFileSync(centralRouterPath, centralRouterFile);
    console.log(`Updated central router with new route: /${folderName}`);
  } else {
    console.log(`Central router file not found at ${centralRouterPath}`);
  }
}

// Get the module name from command line arguments
const moduleName: string | undefined = process.argv[2];
if (!moduleName) {
  console.log(
    "Please provide a module name, e.g., node generateModule UserProfile"
  );
} else {
  createModule(moduleName);
}
