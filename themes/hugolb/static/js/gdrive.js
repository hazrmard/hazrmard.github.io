/**
 * @fileoverview Fetches and displays a list of files from a public Google Drive folder.
 * This script is designed to be used on a client-side website, like a Hugo blog.
 *
 * @version 1.0.0
 * @author Your Name
 *
 * @example
 * <!-- Include in your HTML -->
 * <div class="drive-files-container"></div>
 * <script src="https://apis.google.com/js/api.js"></script>
 * <script src="/js/gdrive.js"></script>
 * <script>
 * // Wait for the gapi script to load before calling our function.
 * window.onload = function() {
 * populateFromGoogleDrive('drive-files-container', 'drive-file-item');
 * };
 * </script>
 */

// --- CONFIGURATION ---
// IMPORTANT: Replace these placeholder values with your actual API Key.
const GOOG_a_p_k = 'AIzaSyAdodfeDwe17EaBzrzYt5PzzHOiexnuaTA';
// -------------------

/**
 * Main function to initialize the Google API client and fetch files.
 * @param {string} parentClassName The class name of the HTML element that will contain the file list.
 * @param {string} itemClassName The class name to apply to each new div created for a file.
 */
function populateFromGoogleDrive(parentClassName, itemClassName, folderId) {
  const parentElement = document.querySelector('.' + parentClassName);
  if (!parentElement) {
    console.error(`Error: Parent element with class "${parentClassName}" not found.`);
    return;
  }

  // Display a loading message
  // parentElement.innerHTML = '<p>Loading files from Google Drive...</p>';

  // Use gapi.load to ensure the client library is ready.
  gapi.load('client', () => {
    initializeGapiClient(parentElement, itemClassName, folderId);
  });
}

/**
 * Initializes the Google API client with the API key and discovery documents.
 * @param {HTMLElement} parentElement The container element for the results.
 * @param {string} itemClassName The class for each file item.
 */
async function initializeGapiClient(parentElement, itemClassName, folderId) {
  try {
    await gapi.client.init({
      apiKey: GOOG_a_p_k,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    // After initialization, execute the file list request.
    await listFiles(parentElement, itemClassName, folderId);
  } catch (error) {
    console.error('Error initializing Google API client:', error);
    // parentElement.innerHTML = `<p style="color: red;">Error: Could not initialize Google API client. Please check your API Key and console for details.</p>`;
  }
}

/**
 * Fetches files from the specified Google Drive folder and populates the parent element.
 * @param {HTMLElement} parentElement The container element for the results.
 * @param {string} itemClassName The class for each file item.
 */
async function listFiles(parentElement, itemClassName, folderId) {
  try {
    const response = await gapi.client.drive.files.list({
      // The query to find files within the specified folder.
      // 'trashed = false' ensures we don't list deleted files.
      q: `'${folderId}' in parents and trashed = false`,
      // The fields parameter specifies which file metadata to retrieve.
      // This is efficient as it only fetches the data we need.
      fields: 'files(id, name, webViewLink, iconLink, modifiedTime, createdTime, description, mimeType)',
      // How many results to return per page.
      pageSize: 50,
      // Order by modification time, newest first.
      orderBy: 'modifiedTime desc',
    });

    const files = response.result.files;
    // Clear the loading message
    // parentElement.innerHTML = '';

    if (files && files.length > 0) {
      files.forEach(file => {
        // Create the main container div for the file
        const newItem = document.createElement('div');
        newItem.className = itemClassName; // Use the provided class name

        // Format the date for better readability
        const modifiedDate = new Date(file.modifiedTime).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Use innerHTML to create the content structure for each file.
        // This makes it easy to style with CSS.
        // newItem.innerHTML = `
        // <div class="file-item-content">
        // <img src="${file.iconLink}" alt="File icon" class="file-icon">
        // <div class="file-details">
        // <a href="${file.webViewLink}" target="_blank" rel="noopener noreferrer" class="file-title">${file.name}</a>
        // ${file.description ? `<p class="file-description">${file.description}</p>` : ''}
        // <p class="file-metadata">Last modified: ${modifiedDate}</p>
        // </div>
        // </div>
        // `;
        // Alternatively, you can use template literals to create the HTML structure.
        newItem.innerHTML = `
          <div class="image" style="background-image: url('${file.iconLink}'); background-size: auto; background-position: center;">
          </div>
          <div class="description">
            <a href="${file.webViewLink}" target="_blank" rel="noopener noreferrer">
              <h3>${file.name} 🡵</h3>
            </a>
            <div class="front-matter">
                ${modifiedDate}
            </div>
          </div>
        `;

        // Append the newly created element to the parent container
        parentElement.appendChild(newItem);
      });
    } else {
      // parentElement.innerHTML = '<p>No files found in the specified folder.</p>';
    }
  } catch (error) {
    console.error('Error fetching files from Google Drive:', error);
    const errorMessage = error.result?.error?.message || 'Check browser console for details.';
    // parentElement.innerHTML = `<p style="color: red;">Error fetching files: ${errorMessage}</p><p>Please ensure the folder is public ("Anyone with the link") and the Folder ID is correct.</p>`;
  }
}
