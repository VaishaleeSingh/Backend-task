'use strict';

// Shared content routes (principal can view all; redirect teachers to /teacher prefix)
const express = require('express');
const router = express.Router();

// This file exists for any shared content routes needed in the future.
// Currently content access is role-separated via /teacher and /principal prefixes.

module.exports = router;
