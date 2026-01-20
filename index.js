class TalorixConnect {
    /**
     * @param {string} baseUrl - The full URL to your Talorix instance (e.g., 'https://panel.example.com')
     * @param {string} apiKey - Your API Key
     */
    constructor(baseUrl, apiKey) {
        if (!baseUrl || !apiKey) {
            throw new Error("Talorix Error: 'baseUrl' and 'apiKey' are required.");
        }
        // Remove trailing slash if present
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.apiKey = apiKey;
        this.headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
            "x-api-key": this.apiKey, // Including both as per docs
        };
    }

    /**
     * Internal request handler
     * @private
     */
    async _req(method, endpoint, body = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this.headers,
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok || (data && data.success === false)) {
                throw new Error(data.error || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            throw new Error(`Talorix API Request Failed: ${error.message}`);
        }
    }

    // ==========================================
    // NODES
    // ==========================================

    /**
     * Create a new node.
     * @param {Object} data - { name, ip, port, ftpPort (optional) }
     */
    async createNode(data) {
        return this._req('POST', '/api/v1/node/create', data);
    }

    /**
     * List all nodes.
     */
    async listNodes() {
        return this._req('GET', '/api/v1/nodes');
    }

    /**
     * Get specific node info.
     * @param {string} id - Node UUID
     */
    async getNode(id) {
        // Docs specify POST for getting node info
        return this._req('POST', `/api/v1/node/${id}`);
    }

    /**
     * Get the configuration command for a node.
     * @param {string} id - Node UUID
     */
    async getNodeConfig(id) {
        return this._req('POST', `/api/v1/node/${id}/configure-key`);
    }

    /**
     * Get node version.
     * @param {string} id - Node UUID
     */
    async getNodeVersion(id) {
        return this._req('GET', `/api/v1/node/ver/${id}`);
    }

    /**
     * Get node statistics.
     * @param {string} id - Node UUID
     */
    async getNodeStats(id) {
        return this._req('GET', `/api/v1/node/stats/${id}`);
    }

    /**
     * Delete a node.
     * @param {string} id - Node UUID
     */
    async deleteNode(id) {
        return this._req('POST', `/api/v1/node/${id}/delete`);
    }

    // ==========================================
    // ALLOCATIONS
    // ==========================================

    /**
     * Add allocation(s) to a node.
     * @param {string} nodeId - Node UUID
     * @param {Object} data - { ip, port } (Port can be number or range "25565-25570")
     */
    async addAllocations(nodeId, data) {
        return this._req('POST', `/api/v1/node/${nodeId}/allocations/add`, data);
    }

    /**
     * Edit an allocation.
     * @param {string} nodeId - Node UUID
     * @param {string} allocationId - Allocation UUID
     * @param {Object} data - { ip, domain, port }
     */
    async editAllocation(nodeId, allocationId, data) {
        return this._req('POST', `/api/v1/node/${nodeId}/allocations/edit/${allocationId}`, data);
    }

    /**
     * Delete an allocation.
     * @param {string} nodeId - Node UUID
     * @param {string} allocationId - Allocation UUID
     */
    async deleteAllocation(nodeId, allocationId) {
        return this._req('DELETE', `/api/v1/node/${nodeId}/allocations/delete/${allocationId}`);
    }

    // ==========================================
    // IMAGES
    // ==========================================

    /**
     * List all images.
     */
    async listImages() {
        return this._req('GET', '/api/v1/images');
    }

    /**
     * Create a new image.
     * @param {Object} data - { dockerImage, name, description, envs, files, features }
     */
    async createImage(data) {
        return this._req('POST', '/api/v1/images/new', data);
    }

    /**
     * Delete an image.
     * @param {string} id - Image UUID
     */
    async deleteImage(id) {
        return this._req('POST', `/api/v1/images/delete/${id}`);
    }

    // ==========================================
    // SERVERS
    // ==========================================

    /**
     * List all servers.
     */
    async listServers() {
        return this._req('GET', '/api/v1/servers');
    }

    /**
     * Create a new server.
     * @param {Object} data - { imageId, nodeId, allocationId, name, ram, core, disk, userId, env }
     */
    async createServer(data) {
        return this._req('POST', '/api/v1/servers/new', data);
    }

    /**
     * Edit a server.
     * @param {string} serverId - Server UUID
     * @param {Object} data - { name, ram, core, disk, imageId, env, files }
     */
    async editServer(serverId, data) {
        return this._req('POST', `/api/v1/edit/${serverId}`, data);
    }

    /**
     * Suspend a server.
     * @param {string} id - Server UUID
     */
    async suspendServer(id) {
        return this._req('POST', `/api/v1/servers/suspend/${id}`);
    }

    /**
     * Unsuspend a server.
     * @param {string} id - Server UUID
     */
    async unsuspendServer(id) {
        return this._req('POST', `/api/v1/servers/unsuspend/${id}`);
    }

    /**
     * Delete a server.
     * @param {string} id - Server UUID
     */
    async deleteServer(id) {
        return this._req('DELETE', `/api/v1/servers/delete/${id}`);
    }

    // ==========================================
    // USERS
    // ==========================================

    /**
     * List all users.
     */
    async listUsers() {
        return this._req('GET', '/api/v1/users');
    }

    /**
     * Get user details.
     * @param {string} id - User UUID
     */
    async getUser(id) {
        return this._req('GET', `/api/v1/user/${id}`);
    }

    /**
     * Get servers owned by a user.
     * @param {string} id - User UUID
     */
    async getUserServers(id) {
        return this._req('GET', `/api/v1/user/${id}/servers`);
    }

    /**
     * Create a new user.
     * @param {Object} data - { email, username, password, admin }
     */
    async createUser(data) {
        return this._req('POST', '/api/v1/users/new', data);
    }

    /**
     * Edit a user.
     * @param {string} id - User UUID
     * @param {Object} data - { email, username, password, admin }
     */
    async editUser(id, data) {
        return this._req('POST', `/api/v1/user/${id}/edit`, data);
    }

    /**
     * Delete a user.
     * @param {string} id - User UUID
     */
    async deleteUser(id) {
        return this._req('POST', `/api/v1/user/${id}/delete`);
    }

    // ==========================================
    // SETTINGS
    // ==========================================

    /**
     * Get application settings.
     */
    async getSettings() {
        return this._req('GET', '/api/v1/settings');
    }

    /**
     * Update application settings.
     * @param {Object} data - { name, registerEnabled }
     */
    async updateSettings(data) {
        return this._req('POST', '/api/v1/settings', data);
    }
}

module.exports = Talorix;
