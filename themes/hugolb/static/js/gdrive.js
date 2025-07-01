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
    // Get all files recursively from the folder and its subfolders
    const allFiles = await getAllFilesRecursively(folderId);
    
    // Filter for only Google Docs, Markdown, and PDFs
    const filteredFiles = allFiles.filter(file => {
      const mimeType = file.mimeType;
      const fileName = file.name.toLowerCase();
      
      return (
        // Google Docs
        mimeType === 'application/vnd.google-apps.document' ||
        // PDFs
        mimeType === 'application/pdf' ||
        // Markdown files
        fileName.endsWith('.md') || fileName.endsWith('.markdown')
      );
    });

    // Sort by modification time, newest first
    filteredFiles.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));

    if (filteredFiles && filteredFiles.length > 0) {
      filteredFiles.forEach(file => {
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
                <em class="front-matter-date">${modifiedDate}</em>
            </div>
          </div>
        `;

        // Insert the item in chronological order based on date
        insertInChronologicalOrder(parentElement, newItem, new Date(file.modifiedTime));
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

/**
 * Recursively fetches all files from a Google Drive folder and its subfolders.
 * @param {string} folderId The ID of the folder to search.
 * @param {Array} allFiles Accumulator array for all files found.
 * @returns {Promise<Array>} Promise that resolves to an array of all files.
 */
async function getAllFilesRecursively(folderId, allFiles = []) {
  try {
    const response = await gapi.client.drive.files.list({
      // Get all items in the current folder
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, webViewLink, iconLink, modifiedTime, createdTime, description, mimeType)',
      pageSize: 1000, // Increase page size for efficiency
    });

    const items = response.result.files;
    
    if (items && items.length > 0) {
      for (const item of items) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          // If it's a folder, recursively get its contents
          await getAllFilesRecursively(item.id, allFiles);
        } else {
          // If it's a file, add it to our collection
          allFiles.push(item);
        }
      }
    }
    
    return allFiles;
  } catch (error) {
    console.error('Error fetching files recursively:', error);
    throw error;
  }
}

/**
 * Inserts a new item into the parent element in reverse chronological order
 * based on the date compared to existing items with front-matter-date elements.
 * @param {HTMLElement} parentElement The container element.
 * @param {HTMLElement} newItem The new item to insert.
 * @param {Date} newItemDate The date of the new item.
 */
function insertInChronologicalOrder(parentElement, newItem, newItemDate) {
  const existingItems = Array.from(parentElement.children);
  
  // Find the correct position to insert the new item
  let insertPosition = -1;
  
  for (let i = 0; i < existingItems.length; i++) {
    const existingItem = existingItems[i];
    const frontMatterDate = existingItem.querySelector('.front-matter-date');
    
    if (frontMatterDate) {
      // Parse the existing date string back to a Date object
      const existingDateString = frontMatterDate.textContent.trim();
      const existingDate = new Date(existingDateString);
      
      // If the new item is newer than the existing item, insert before it
      if (newItemDate > existingDate) {
        insertPosition = i;
        break;
      }
    }
  }
  
  // Insert the new item at the correct position
  if (insertPosition === -1) {
    // New item is oldest, append to the end
    parentElement.appendChild(newItem);
  } else {
    // Insert before the item at insertPosition
    parentElement.insertBefore(newItem, existingItems[insertPosition]);
  }
}
