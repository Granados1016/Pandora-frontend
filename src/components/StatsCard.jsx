import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

export default function StatsCard({ title, value, subtitle, icon, color = 'primary.main' }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500} mb={0.5}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={800} color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.8, fontSize: 36 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
