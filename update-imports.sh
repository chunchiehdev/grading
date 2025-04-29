#!/bin/bash

echo "Starting import replacements..."

# Set the directory to search in
DIR="app"

# Find all TypeScript and TSX files
FILES=$(find $DIR -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*")

# Process each file
for file in $FILES; do
  echo "Processing $file"
  
  # Replace @remix-run/react imports with react-router-dom
  sed -i 's/@remix-run\/react/react-router-dom/g' "$file"
  
  # Replace remix-utils/sse/react with react-router-dom/sse/client
  sed -i 's/remix-utils\/sse\/react/react-router-dom\/sse\/client/g' "$file"
  
  # Replace remix-utils/sse/server with react-router-dom/sse/server
  sed -i 's/remix-utils\/sse\/server/react-router-dom\/sse\/server/g' "$file"
  
  # Replace remix-themes with local theme provider
  sed -i 's/remix-themes/..\/theme-provider/g' "$file"
  
  # Replace @remix-run/node with @react-router/node
  sed -i 's/@remix-run\/node/@react-router\/node/g' "$file"
  
  # Replace MetaFunction/LinksFunction with MetaDescriptor/LinkDescriptor
  sed -i 's/MetaFunction/MetaDescriptor/g' "$file"
  sed -i 's/LinksFunction/LinkDescriptor/g' "$file"
  
  # Replace Form component import
  sed -i 's/import { Form } from "react-router-dom"/import { Form } from "react-router-dom"/g' "$file"
  
  # Replace useSubmit, useTransition and other hooks
  sed -i 's/useTransition/useNavigation/g' "$file"
  sed -i 's/json(/json(/g' "$file"
  sed -i 's/redirect(/redirect(/g' "$file"
done

echo "Import replacements completed!" 