/**
 * Search API Routes
 * Provides endpoints for advanced product search and filtering
 */

const express = require('express');
const SearchEngine = require('../lib/search/searchEngine');
const FilterEngine = require('../lib/search/filterEngine');
const SavedSearches = require('../lib/search/savedSearches');
const { Parser } = require('json2csv');

module.exports = (db) => {
  const router = express.Router();

  /**
   * POST /api/search
   * Advanced product search with filters
   */
  router.post('/', async (req, res) => {
    try {
      const { query, filters = {}, options = {} } = req.body;
      const rawDb = db.db || db;

      let results;
      
      if (query && query.trim().length > 0) {
        // Text search
        const searchEngine = new SearchEngine(rawDb);
        results = await searchEngine.searchProducts(query, options);
        
        // Log search
        await searchEngine.logSearch(query, results.length, req.user?.id);
      } else {
        // Filter-only search
        const filterEngine = new FilterEngine(rawDb);
        results = await filterEngine.applyFilters(filters, options);
      }

      res.json({
        success: true,
        query,
        filters,
        count: Array.isArray(results) ? results.length : results.total,
        data: Array.isArray(results) ? results : results.data,
        pagination: results.data ? {
          total: results.total,
          limit: results.limit,
          offset: results.offset,
          hasMore: results.hasMore
        } : null
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/search/autocomplete
   * Get autocomplete suggestions
   */
  router.get('/autocomplete', async (req, res) => {
    try {
      const { q } = req.query;
      const searchEngine = new SearchEngine(db.db || db);
      const suggestions = await searchEngine.getAutocompleteSuggestions(q, 10);

      res.json({
        success: true,
        suggestions
      });
    } catch (error) {
      console.error('Autocomplete error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/search/quick-lookup/:code
   * Quick lookup by barcode or SKU
   */
  router.get('/quick-lookup/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const searchEngine = new SearchEngine(db.db || db);
      const product = await searchEngine.quickLookup(code);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Quick lookup error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/search/recent
   * Get user's recent searches
   */
  router.get('/recent', async (req, res) => {
    try {
      const searchEngine = new SearchEngine(db.db || db);
      const searches = await searchEngine.getRecentSearches(req.user?.id || 0, 10);

      res.json({
        success: true,
        data: searches
      });
    } catch (error) {
      console.error('Recent searches error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/search/popular
   * Get popular search queries
   */
  router.get('/popular', async (req, res) => {
    try {
      const searchEngine = new SearchEngine(db.db || db);
      const searches = await searchEngine.getPopularSearches(10);

      res.json({
        success: true,
        data: searches
      });
    } catch (error) {
      console.error('Popular searches error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/search/filter-options
   * Get available filter options
   */
  router.get('/filter-options', async (req, res) => {
    try {
      const filterEngine = new FilterEngine(db.db || db);
      const options = await filterEngine.getFilterOptions();

      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      console.error('Filter options error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/search/export
   * Export search results
   */
  router.post('/export', async (req, res) => {
    try {
      const { query, filters = {}, format = 'csv' } = req.body;
      const rawDb = db.db || db;

      // Get search results (no pagination for export)
      const filterEngine = new FilterEngine(rawDb);
      const results = query && query.trim().length > 0
        ? await new SearchEngine(rawDb).searchProducts(query, { limit: 10000 })
        : await filterEngine.applyFilters(filters, { limit: 10000 });

      const data = Array.isArray(results) ? results : results.data;

      if (format === 'csv') {
        const fields = ['id', 'name', 'sku', 'category_name', 'stock_quantity', 'price', 'cost'];
        const parser = new Parser({ fields });
        const csv = parser.parse(data);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=products.json');
        res.json(data);
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/saved-searches
   * Get user's saved searches
   */
  router.get('/saved-searches', async (req, res) => {
    try {
      const savedSearches = new SavedSearches(db.db || db);
      const searches = await savedSearches.getUserSearches(req.user?.id || 0);

      res.json({
        success: true,
        data: searches
      });
    } catch (error) {
      console.error('Get saved searches error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/saved-searches
   * Save a new search
   */
  router.post('/saved-searches', async (req, res) => {
    try {
      const savedSearches = new SavedSearches(db.db || db);
      const searchId = await savedSearches.saveSearch(req.user?.id || 0, req.body);

      res.json({
        success: true,
        id: searchId
      });
    } catch (error) {
      console.error('Save search error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * PUT /api/saved-searches/:id
   * Update a saved search
   */
  router.put('/saved-searches/:id', async (req, res) => {
    try {
      const searchId = parseInt(req.params.id);
      const savedSearches = new SavedSearches(db.db || db);
      const success = await savedSearches.updateSearch(searchId, req.user?.id || 0, req.body);

      res.json({ success });
    } catch (error) {
      console.error('Update search error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * DELETE /api/saved-searches/:id
   * Delete a saved search
   */
  router.delete('/saved-searches/:id', async (req, res) => {
    try {
      const searchId = parseInt(req.params.id);
      const savedSearches = new SavedSearches(db.db || db);
      const success = await savedSearches.deleteSearch(searchId, req.user?.id || 0);

      res.json({ success });
    } catch (error) {
      console.error('Delete search error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/saved-searches/:id/execute
   * Execute a saved search
   */
  router.post('/saved-searches/:id/execute', async (req, res) => {
    try {
      const searchId = parseInt(req.params.id);
      const rawDb = db.db || db;
      const savedSearches = new SavedSearches(rawDb);
      const searchEngine = new SearchEngine(rawDb);
      const filterEngine = new FilterEngine(rawDb);

      const results = await savedSearches.executeSearch(
        searchId,
        req.user?.id || 0,
        searchEngine,
        filterEngine
      );

      res.json({
        success: true,
        ...results
      });
    } catch (error) {
      console.error('Execute search error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};
