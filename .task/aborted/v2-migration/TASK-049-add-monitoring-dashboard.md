# Task: TASK-049-add-monitoring-dashboard
Priority: medium
Status: pending

## User Acceptance Criteria
- [ ] Admin dashboard for monitoring all sync operations
- [ ] Real-time sync status display with live updates
- [ ] Error reporting and resolution tracking
- [ ] Performance metrics and analytics
- [ ] Manual sync trigger controls
- [ ] All dashboard components properly tested

## Test Plan
### Unit Tests
- [ ] Test dashboard components render correctly
- [ ] Test sync status API endpoints
- [ ] Test real-time updates via WebSocket
- [ ] Test error display and filtering
- [ ] Co-located test files: SyncDashboard.test.tsx, SyncStatusAPI.test.ts

### Integration Tests  
- [ ] Test dashboard with real sync data
- [ ] Test manual sync triggers work correctly
- [ ] Test WebSocket connection and updates

### Manual Testing
- [ ] Navigate through all dashboard screens
- [ ] Trigger manual syncs and verify updates
- [ ] Test dashboard responsiveness on different devices

## Implementation Details
Create comprehensive admin monitoring dashboard:

### Main Dashboard Component
```typescript
// client/src/components/admin/sync/SyncDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, Grid, Tab, Tabs, Box, Button, Alert } from '@mui/material';
import { SyncStatusOverview } from './SyncStatusOverview';
import { SyncMetrics } from './SyncMetrics';
import { ErrorLog } from './ErrorLog';
import { SyncControls } from './SyncControls';
import { useSyncStatus } from '../../../hooks/useSyncStatus';
import { useWebSocket } from '../../../hooks/useWebSocket';

export const SyncDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { 
    syncStatus, 
    metrics, 
    errors, 
    loading, 
    refreshData,
    triggerSync 
  } = useSyncStatus();
  
  // WebSocket for real-time updates
  const { connected, lastMessage } = useWebSocket('/admin/sync-updates', {
    onMessage: (data) => {
      // Update sync status in real-time
      refreshData();
    }
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleManualSync = async (syncType: string) => {
    try {
      await triggerSync(syncType);
      // Real-time updates will refresh the data
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  return (
    <div className="sync-dashboard">
      <div className="dashboard-header">
        <h1>Flourio Synchronization Dashboard</h1>
        <div className="connection-status">
          {connected ? (
            <Alert severity="success" variant="outlined">
              Live Updates Connected
            </Alert>
          ) : (
            <Alert severity="warning" variant="outlined">
              Live Updates Disconnected
            </Alert>
          )}
        </div>
      </div>

      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid item xs={12}>
          <SyncStatusOverview 
            syncStatus={syncStatus} 
            loading={loading}
            onRefresh={refreshData}
          />
        </Grid>

        {/* Main Content */}
        <Grid item xs={12}>
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab label="Live Status" />
                <Tab label="Metrics & Analytics" />
                <Tab label="Error Log" />
                <Tab label="Manual Controls" />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              {activeTab === 0 && (
                <SyncStatusTable 
                  syncStatus={syncStatus}
                  loading={loading}
                />
              )}
              
              {activeTab === 1 && (
                <SyncMetrics 
                  metrics={metrics}
                  loading={loading}
                />
              )}
              
              {activeTab === 2 && (
                <ErrorLog 
                  errors={errors}
                  loading={loading}
                />
              )}
              
              {activeTab === 3 && (
                <SyncControls 
                  onManualSync={handleManualSync}
                  loading={loading}
                />
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};
```

### Sync Status Overview Component
```typescript
// client/src/components/admin/sync/SyncStatusOverview.tsx
import React from 'react';
import { Card, CardContent, Typography, Grid, Chip, LinearProgress } from '@mui/material';
import { CheckCircle, Error, Schedule, Sync } from '@mui/icons-material';

interface SyncStatusOverviewProps {
  syncStatus: SyncStatusSummary;
  loading: boolean;
  onRefresh: () => void;
}

export const SyncStatusOverview: React.FC<SyncStatusOverviewProps> = ({
  syncStatus,
  loading,
  onRefresh
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'in_progress':
        return <Sync color="primary" />;
      default:
        return <Schedule color="warning" />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'synced':
        return 'success';
      case 'error':
        return 'error';
      case 'in_progress':
        return 'info';
      default:
        return 'warning';
    }
  };

  return (
    <Grid container spacing={3}>
      {syncStatus.types?.map((typeStatus) => (
        <Grid item xs={12} sm={6} md={3} key={typeStatus.type}>
          <Card>
            <CardContent>
              <div className="status-header">
                {getStatusIcon(typeStatus.status)}
                <Typography variant="h6" component="h2">
                  {typeStatus.type.replace('_', ' ').toUpperCase()}
                </Typography>
              </div>
              
              <Chip 
                label={typeStatus.status}
                color={getStatusColor(typeStatus.status)}
                size="small"
                sx={{ mb: 2 }}
              />
              
              {typeStatus.progress && (
                <div className="progress-section">
                  <Typography variant="body2" color="textSecondary">
                    Progress: {typeStatus.progress.completed} / {typeStatus.progress.total}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(typeStatus.progress.completed / typeStatus.progress.total) * 100}
                    sx={{ mt: 1 }}
                  />
                </div>
              )}
              
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Last sync: {typeStatus.lastSyncAt ? 
                  new Date(typeStatus.lastSyncAt).toLocaleString() : 
                  'Never'
                }
              </Typography>
              
              {typeStatus.nextRetryAt && (
                <Typography variant="caption" display="block" color="warning.main">
                  Next retry: {new Date(typeStatus.nextRetryAt).toLocaleString()}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
```

### Sync Metrics Component
```typescript
// client/src/components/admin/sync/SyncMetrics.tsx
import React, { useState } from 'react';
import { 
  Card, CardContent, Typography, Grid, 
  FormControl, InputLabel, Select, MenuItem 
} from '@mui/material';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';

interface SyncMetricsProps {
  metrics: SyncMetricsData;
  loading: boolean;
}

export const SyncMetrics: React.FC<SyncMetricsProps> = ({ metrics, loading }) => {
  const [timeRange, setTimeRange] = useState('24h');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Grid container spacing={3}>
      {/* Time Range Selector */}
      <Grid item xs={12}>
        <FormControl>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="1h">Last Hour</MenuItem>
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* Success Rate Over Time */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Success Rate Over Time
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.successRateOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="successRate" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Sync Volume */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sync Volume by Type
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.volumeByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="successful" fill="#00C49F" name="Successful" />
                <Bar dataKey="failed" fill="#FF8042" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Error Distribution */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Error Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.errorsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {metrics.errorsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Performance Metrics */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Average Sync Duration
                </Typography>
                <Typography variant="h4">
                  {metrics.averageDuration?.toFixed(2)}s
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Items/Minute
                </Typography>
                <Typography variant="h4">
                  {metrics.itemsPerMinute?.toFixed(0)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Retry Rate
                </Typography>
                <Typography variant="h4">
                  {metrics.retryRate?.toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Circuit Breaker Trips
                </Typography>
                <Typography variant="h4">
                  {metrics.circuitBreakerTrips || 0}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
```

### Error Log Component
```typescript
// client/src/components/admin/sync/ErrorLog.tsx
import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, Chip, IconButton, Collapse, Typography,
  TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { ExpandMore, ExpandLess, Refresh } from '@mui/icons-material';

interface ErrorLogProps {
  errors: SyncError[];
  loading: boolean;
}

export const ErrorLog: React.FC<ErrorLogProps> = ({ errors, loading }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState({
    type: '',
    errorType: '',
    resolved: 'all'
  });

  const toggleExpanded = (errorId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(errorId)) {
      newExpanded.delete(errorId);
    } else {
      newExpanded.add(errorId);
    }
    setExpandedRows(newExpanded);
  };

  const filteredErrors = errors.filter(error => {
    if (filter.type && error.type !== filter.type) return false;
    if (filter.errorType && error.errorType !== filter.errorType) return false;
    if (filter.resolved === 'resolved' && !error.resolved) return false;
    if (filter.resolved === 'unresolved' && error.resolved) return false;
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="error-filters" style={{ marginBottom: '20px' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sync Type</InputLabel>
              <Select
                value={filter.type}
                label="Sync Type"
                onChange={(e) => setFilter({...filter, type: e.target.value})}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="document_sync">Document Sync</MenuItem>
                <MenuItem value="stock_sync">Stock Sync</MenuItem>
                <MenuItem value="business_partner_sync">Business Partner</MenuItem>
                <MenuItem value="article_sync">Article Sync</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Error Type</InputLabel>
              <Select
                value={filter.errorType}
                label="Error Type"
                onChange={(e) => setFilter({...filter, errorType: e.target.value})}
              >
                <MenuItem value="">All Errors</MenuItem>
                <MenuItem value="network">Network</MenuItem>
                <MenuItem value="validation">Validation</MenuItem>
                <MenuItem value="business_logic">Business Logic</MenuItem>
                <MenuItem value="system">System</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filter.resolved}
                label="Status"
                onChange={(e) => setFilter({...filter, resolved: e.target.value})}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="unresolved">Unresolved</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Error Type</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Retry Count</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredErrors.map((error) => (
              <React.Fragment key={error.id}>
                <TableRow>
                  <TableCell>
                    {new Date(error.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={error.type}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={error.errorType}
                      size="small"
                      color={error.errorType === 'network' ? 'warning' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    {error.errorMessage.length > 100 
                      ? `${error.errorMessage.substring(0, 100)}...`
                      : error.errorMessage
                    }
                  </TableCell>
                  <TableCell>
                    {error.retryCount}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={error.resolved ? 'Resolved' : 'Open'}
                      color={error.resolved ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small"
                      onClick={() => toggleExpanded(error.id)}
                    >
                      {expandedRows.has(error.id) ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </TableCell>
                </TableRow>
                
                {expandedRows.has(error.id) && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Collapse in={expandedRows.has(error.id)}>
                        <div style={{ padding: '16px' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Full Error Details
                          </Typography>
                          <Typography variant="body2" component="pre" sx={{ 
                            backgroundColor: '#f5f5f5', 
                            padding: '8px', 
                            borderRadius: '4px',
                            fontSize: '12px',
                            overflow: 'auto'
                          }}>
                            {error.errorStack || error.errorMessage}
                          </Typography>
                          
                          {error.entityId && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Entity ID:</strong> {error.entityId}
                            </Typography>
                          )}
                          
                          {error.resolution && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Resolution:</strong> {error.resolution}
                            </Typography>
                          )}
                        </div>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
```

### Manual Sync Controls
```typescript
// client/src/components/admin/sync/SyncControls.tsx
import React, { useState } from 'react';
import { 
  Card, CardContent, Typography, Grid, Button, 
  FormControlLabel, Switch, Alert, Snackbar 
} from '@mui/material';
import { Sync, Stop, PlayArrow, Pause } from '@mui/icons-material';

interface SyncControlsProps {
  onManualSync: (syncType: string) => Promise<void>;
  loading: boolean;
}

export const SyncControls: React.FC<SyncControlsProps> = ({ onManualSync, loading }) => {
  const [enabledServices, setEnabledServices] = useState({
    document_sync: true,
    stock_sync: true,
    business_partner_sync: true,
    article_sync: true
  });
  const [notification, setNotification] = useState<{message: string, severity: 'success'|'error'} | null>(null);

  const syncTypes = [
    { key: 'document_sync', label: 'Document Sync', description: 'Sync invoices and receipts from Flourio' },
    { key: 'stock_sync', label: 'Stock Sync', description: 'Sync Mietfächer with Flourio stocks' },
    { key: 'business_partner_sync', label: 'Business Partner Sync', description: 'Sync vendors with business partners' },
    { key: 'article_sync', label: 'Article Sync', description: 'Sync products with Flourio articles' }
  ];

  const handleManualSync = async (syncType: string) => {
    try {
      await onManualSync(syncType);
      setNotification({
        message: `${syncType} started successfully`,
        severity: 'success'
      });
    } catch (error) {
      setNotification({
        message: `Failed to start ${syncType}: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const handleServiceToggle = (serviceKey: string) => {
    setEnabledServices(prev => ({
      ...prev,
      [serviceKey]: !prev[serviceKey]
    }));
  };

  return (
    <div>
      <Grid container spacing={3}>
        {syncTypes.map((syncType) => (
          <Grid item xs={12} md={6} key={syncType.key}>
            <Card>
              <CardContent>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Typography variant="h6" gutterBottom>
                      {syncType.label}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      {syncType.description}
                    </Typography>
                  </div>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={enabledServices[syncType.key]}
                        onChange={() => handleServiceToggle(syncType.key)}
                      />
                    }
                    label="Enabled"
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="contained"
                    startIcon={<Sync />}
                    onClick={() => handleManualSync(syncType.key)}
                    disabled={loading || !enabledServices[syncType.key]}
                    size="small"
                  >
                    Run Once
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<PlayArrow />}
                    disabled={loading}
                    size="small"
                  >
                    Resume
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<Pause />}
                    disabled={loading}
                    size="small"
                  >
                    Pause
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        {/* Global Controls */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Global Controls
              </Typography>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Sync />}
                  onClick={() => handleManualSync('all')}
                  disabled={loading}
                >
                  Run All Syncs
                </Button>
                
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<Stop />}
                  disabled={loading}
                >
                  Stop All Syncs
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Sync />}
                  disabled={loading}
                >
                  Process Dead Letter Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
      >
        {notification && (
          <Alert 
            onClose={() => setNotification(null)} 
            severity={notification.severity}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </div>
  );
};
```

### WebSocket Hook for Real-time Updates
```typescript
// client/src/hooks/useWebSocket.ts
import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

export function useWebSocket(endpoint: string, options?: {
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000', {
      path: endpoint
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      options?.onConnect?.();
    });

    socket.on('disconnect', () => {
      setConnected(false);
      options?.onDisconnect?.();
    });

    socket.on('sync-update', (data) => {
      setLastMessage(data);
      options?.onMessage?.(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [endpoint]);

  return {
    connected,
    lastMessage,
    socket: socketRef.current
  };
}
```

## Dependencies
- TASK-045-add-sync-status-tracking (sync status data needed)
- TASK-046-implement-error-recovery (error data needed)

## Definition of Done
- [ ] Admin dashboard displays all sync operations
- [ ] Real-time updates via WebSocket working
- [ ] Error log with filtering and details
- [ ] Performance metrics and charts
- [ ] Manual sync trigger controls
- [ ] Responsive design for different screen sizes
- [ ] All dashboard components properly tested
- [ ] WebSocket connection handling robust
- [ ] Admin authentication and authorization
- [ ] Code review completed (if applicable)