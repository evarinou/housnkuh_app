# Known Issues

This document tracks known issues and warnings that don't affect application functionality but may appear during development or build processes.

## Build Warnings

### react-datepicker Source Map Warnings

**Status**: Known, Non-Critical  
**First Observed**: 2025-08-05  
**Affects**: Build process output only

#### Description
During the build process, you may encounter multiple source map warnings related to the `react-datepicker` library:

```
Failed to parse source map from '/home/evms/housnkuh_app/client/node_modules/react-datepicker/src/calendar.tsx' file: Error: ENOENT: no such file or directory
Failed to parse source map from '/home/evms/housnkuh_app/client/node_modules/react-datepicker/src/calendar_container.tsx' file: Error: ENOENT: no such file or directory
Failed to parse source map from '/home/evms/housnkuh_app/client/node_modules/react-datepicker/src/calendar_icon.tsx' file: Error: ENOENT: no such file or directory
[... and similar warnings for other react-datepicker source files]
```

#### Cause
These warnings occur because:
- The `react-datepicker` npm package includes references to source map files
- The referenced source files (TypeScript `.tsx` files) are not included in the distributed npm package
- This is a packaging issue on the library maintainer's side

#### Impact
- **No impact on functionality**: The application works correctly despite these warnings
- **No impact on production**: The built application runs without issues
- **No impact on debugging**: React DevTools and browser debugging still work normally
- **Only affects**: Build console output aesthetics

#### Suppressing the Warnings (Optional)

If you want to suppress these warnings to clean up your build output, you have several options:

##### Option 1: Environment Variable (Simplest)
Set the environment variable to ignore source map errors:
```bash
GENERATE_SOURCEMAP=false npm run build
```

##### Option 2: Webpack Configuration
Add to your webpack configuration (if ejected from Create React App):
```javascript
module.exports = {
  // ... other config
  ignoreWarnings: [
    /Failed to parse source map from.*react-datepicker/,
  ],
};
```

##### Option 3: Create React App without Ejecting
Create a `.env` file in the client directory if it doesn't exist:
```bash
# client/.env
GENERATE_SOURCEMAP=false
```

**Note**: Disabling source maps entirely (Options 1 and 3) will affect debugging capabilities for your own code. Use with caution during development.

#### Resolution Status
- This is a known issue with the `react-datepicker` library
- GitHub issue tracker: Various issues have been reported upstream
- No fix required on our end as it doesn't affect functionality
- May be resolved in future versions of `react-datepicker`

---

## Other Known Issues

_(This section will be updated as new non-critical issues are discovered)_

---

## Contributing to This Document

When adding new known issues:
1. Include the date first observed
2. Clearly describe the issue and its symptoms
3. Explain why it's non-critical
4. Provide workarounds if available
5. Link to upstream issue trackers when relevant