import React from 'react';
import { CuraCardScanner } from '../components/CuraCardScanner';

export const AmbulanceScannerPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <CuraCardScanner portalRole="PARAMEDIC" />
    </div>
  );
};
