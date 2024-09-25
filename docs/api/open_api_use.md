# Use of OpenAPI:
## Frontend
To use the openapi in the frontend, generate the `frontend/src/types/generated.ts`.
You can do this by running the following command:

``$ npx openapi-typescript ../docs/api/openapi.yaml --output ./src/types/generated.ts``

This will update all types, api definitions, etc. in the frontend.