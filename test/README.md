## Steps to set up the test environment

1. Create a new Firebase project
2. Enable Firestore in the project
3. Copy you project configuration into `config/project.json`

   It should look like this:

   ```json
   {
     "apiKey": "...",
     "authDomain": "<PROJECT>.firebaseapp.com",
     "databaseURL": "https://<PROJECT>.firebaseio.com",
     "projectId": "<PROJECT>",
     "storageBucket": "<PROJECT>.appspot.com",
     "messagingSenderId": "..."
   }
   ```

4. Generate a service account file and save it as `config/serviceAccountKey.json`

   It should look like this:

   ```json
   {
     "type": "service_account",
     "project_id": "<PROJECT>",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----...",
     "client_email": "...",
     "client_id": "...",
     "auth_uri": "...",
     "token_uri": "...",
     "auth_provider_x509_cert_url": "...",
     "client_x509_cert_url": "..."
   }
   ```

5. Run `yarn test:setup`
   
   ![WARNING](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAAKAQMAAACg+5oeAAAAA1BMVEXwPBUMkNMeAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAADUlEQVQYGWMYBSMYAAAB/gAB2bMmfwAAAABJRU5ErkJggg==) 
   
   **WARNING!! This will erase all Firestore data for this project!**
   
   ![WARNING](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAAKAQMAAACg+5oeAAAAA1BMVEXwPBUMkNMeAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAADUlEQVQYGWMYBSMYAAAB/gAB2bMmfwAAAABJRU5ErkJggg==) 

## Launching the tests

Once your test environment is set up you can launch the suite of test by running `yarn test`