/**
 * Handles YouTube search functionality through a proxy
 */
class YouTubeSearchService {
    /**
     * Initialize the service
     * @returns {void}
     */
    constructor() {
        this.proxyUrl      = 'https://cors-anywhere.herokuapp.com/';
        this.searchUrl     = 'https://www.youtube.com/results?search_query=';
        this.corsUnblocked = false;
    }

    /**
     * Preleva il token dinamicamente dalla pagina di demo
     * @returns {Promise<string>} token di sblocco per il proxy CORS
     */
    fetchCorsToken() {
        // Rimuovi 'no-cors' qui, altrimenti non puoi leggere il body
        return fetch(this.proxyUrl + 'corsdemo', { method: 'GET' }).then(function(res) {
            if (!res.ok) {
                throw new Error('Impossibile caricare corsdemo: ' + res.status);
            }
            return res.text();
        }).then(function(html) {
            // Estrai il valore dell'input (usa regex o DOMParser)
            var match = html.match(/<input\s+name="accessRequest"\s+value="([^"]+)"/);
            if (!match) {
                throw new Error('Token di sblocco non trovato nella pagina');
            }
            return match[1];
        });
    }

    /**
     * Tenta di sbloccare CORS Anywhere
     * @returns {Promise<boolean>} true se lo sblocco è riuscito, false altrimenti
     */
    unblockCorsAnywhere() {
        var self = this;
        if (this.corsUnblocked) {
            return Promise.resolve(true);
        }

        return this.fetchCorsToken().then(function(token) {
            var formData = new FormData();
            formData.append('accessRequest', token);

            return fetch(self.proxyUrl + 'corsdemo', {
                method: 'POST',
                body: formData,
                mode: 'no-cors'
            });
        }).then(function(response) {
            if (!response.ok && response.type !== 'opaque') {
                console.warn('POST di sblocco fallita:', response.status);
                return false;
            }

            self.corsUnblocked = true;
            return true;
        }).catch(function(err) {
            console.warn('Errore nello sblocco CORS Anywhere:', err);
            return false;
        });
    }

    /**
     * Extract video ID from a YouTube URL
     * @param {String} url - YouTube URL
     * @returns {String|null} Video ID or null if invalid
     */
    extractVideoId(url) {
        if (!url) {
            return null;
        }

        // Handle shortened URLs like youtu.be/VIDEO_ID
        const shortUrlRegex = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
        const shortMatch = url.match(shortUrlRegex);
        if (shortMatch) {
            return shortMatch[1];
        }

        // Handle regular YouTube URLs
        const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[1].length === 11) ? match[1] : null;
    }

    /**
     * Check if input is a YouTube URL or video ID
     * @param {String} input - User input
     * @returns {String|null} Video ID or null if not a URL/ID
     */
    isYouTubeUrl(input) {
        if (!input) {
            return null;
        }

        // Check if it's already a valid video ID (11 characters)
        if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
            return input;
        }

        // Otherwise check if it's a URL
        return this.extractVideoId(input);
    }

    /**
     * Get details for a specific video by scraping the page
     * @param {String} videoId - YouTube video ID
     * @returns {Promise<Object|null>} Video details or null if not found
     */
    getVideoDetails(videoId) {
        if (!videoId) {
            return Promise.resolve(null);
        }

        var self = this;
        var initialUrl = this.proxyUrl + 'https://www.youtube.com/watch?v=' + videoId;

        return fetch(initialUrl).then(function(response) {
            if (!response.ok) {
                console.log('Initial video details fetch failed, attempting to unblock CORS...');
                return self.unblockCorsAnywhere().then(function() {
                    return fetch(initialUrl);
                });
            }
            return response;
        }).then(function(response) {
            if (!response.ok) {
                throw new Error('Error fetching video data even after unblock attempt');
            }
            return response.text();
        }).then(function(html) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, 'text/html');

            // Try to extract video information from meta tags
            var titleMeta = doc.querySelector('meta[property="og:title"]');
            var title = titleMeta ? titleMeta.getAttribute('content') : 'Unknown Video';

            var thumbnailMeta = doc.querySelector('meta[property="og:image"]');
            var thumbnail = thumbnailMeta ? thumbnailMeta.getAttribute('content') : '';

            // Extract author from schema.org markup
            var author = 'Unknown Channel';
            var authorMeta = doc.querySelector('link[itemprop="name"]');
            if (authorMeta) {
                author = authorMeta.getAttribute('content');
            }

            // Try to get duration from meta tags
            var lengthSeconds = 0;
            var durationMeta = doc.querySelector('meta[itemprop="duration"]');
            if (durationMeta) {
                var duration = durationMeta.getAttribute('content');
                // Format is typically PT1H23M45S for 1:23:45
                if (duration) {
                    var hours = duration.match(/(\d+)H/);
                    var minutes = duration.match(/(\d+)M/);
                    var seconds = duration.match(/(\d+)S/);

                    lengthSeconds = (hours ? parseInt(hours[1]) * 3600 : 0) +
                                    (minutes ? parseInt(minutes[1]) * 60 : 0) +
                                    (seconds ? parseInt(seconds[1]) : 0);
                }
            }

            return {
                videoId: videoId,
                title: title,
                author: author,
                thumbnail: thumbnail,
                lengthSeconds: lengthSeconds
            };
        }).catch(function(error) {
            console.error('Error getting video details:', error);
            return null;
        });
    }

    /**
     * Search for videos using YouTube search page
     * @param {String} query - Search query
     * @returns {Promise<Array>} Search results
     */
    searchVideos(query) {
        if (!query) {
            return Promise.resolve([]);
        }

        var self = this;
        var encodedQuery = encodeURIComponent(query.trim());
        var searchUrl = this.proxyUrl + this.searchUrl + encodedQuery;

        return fetch(searchUrl).then(function(response) {
            if (!response.ok) {
                console.log('Initial search failed, attempting to unblock CORS...');
                return self.unblockCorsAnywhere().then(function() {
                    return fetch(searchUrl);
                });
            }
            return response;
        }).then(function(response) {
            if (!response.ok) {
                throw new Error('Error in proxy response even after unblock attempt');
            }
            return response.text();
        }).then(function(html) {
            return self.parseYouTubeResults(html);
        }).catch(function(error) {
            console.error('Search error:', error);
            return [];
        });
    }

    /**
     * Parse YouTube search results HTML
     * @param {String} html - HTML content from YouTube search page
     * @returns {Array} Array of video objects
     */
    parseYouTubeResults(html) {
        const videos = [];

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Cerca lo script con ytInitialData
            const scripts = doc.querySelectorAll('script');
            let ytInitialData = null;

            for (const script of scripts) {
                const text = script.textContent;
                if (text.includes('var ytInitialData =') || text.includes('window["ytInitialData"] =')) {
                    const jsonStrMatch = text.match(/ytInitialData\s*=\s*(\{.+?\});/) ||
                                         text.match(/window\["ytInitialData"\]\s*=\s*(\{.+?\});/);
                    if (jsonStrMatch && jsonStrMatch[1]) {
                        try {
                            ytInitialData = JSON.parse(jsonStrMatch[1]);
                        } catch (e) {
                            console.error('Error parsing JSON ytInitialData', e);
                        }
                    }
                    break;
                }
            }

            if (!ytInitialData) {
                return videos;
            }

            const videoItems = ytInitialData.contents
                .twoColumnSearchResultsRenderer.primaryContents
                .sectionListRenderer.contents[0]
                .itemSectionRenderer.contents;

            for (const item of videoItems) {
                if (item.videoRenderer) {
                    const video = item.videoRenderer;
                    const videoId = video.videoId;

                    // Skip non-video items or videos without ID
                    if (!videoId) {
                        continue;
                    }

                    const title = video.title.runs[0].text;
                    const thumbnail = video.thumbnail.thumbnails.pop().url;

                    // Get author name
                    let author = 'Unknown Channel';
                    if (video.ownerText && video.ownerText.runs && video.ownerText.runs.length > 0) {
                        author = video.ownerText.runs[0].text;
                    }

                    // Get length in seconds
                    let lengthSeconds = 0;
                    if (video.lengthText && video.lengthText.simpleText) {
                        // Parse duration format (e.g., "12:34" or "1:23:45")
                        const lengthParts = video.lengthText.simpleText.split(':').map(Number);
                        if (lengthParts.length === 2) {
                            // MM:SS format
                            lengthSeconds = lengthParts[0] * 60 + lengthParts[1];
                        } else if (lengthParts.length === 3) {
                            // HH:MM:SS format
                            lengthSeconds = lengthParts[0] * 3600 + lengthParts[1] * 60 + lengthParts[2];
                        }
                    }

                    videos.push({
                        videoId,
                        title,
                        author,
                        thumbnail,
                        lengthSeconds
                    });

                    // Limit to 20 results
                    if (videos.length >= 20) {
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Error parsing YouTube results:', error);
        }

        return videos;
    }
}

// Create global instance
const youtubeSearchService = new YouTubeSearchService();

// End of file
