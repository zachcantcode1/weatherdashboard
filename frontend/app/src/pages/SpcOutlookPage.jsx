// src/pages/SpcOutlookPage.jsx
import React from 'react';
import { SPCOutlook } from '@/components/SPCOutlook';

const SpcOutlookPage = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">SPC Outlooks</h1>
      <SPCOutlook />
    </div>
  );
};

export default SpcOutlookPage;
