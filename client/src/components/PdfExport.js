import React, { useState } from 'react';
import '../styles/PdfExport.css';

function PdfExport({ negotiation }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      // Dynamic import for code splitting
      const [jsPDFModule, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);
      const jsPDF = jsPDFModule.default;
      const html2canvas = html2canvasModule.default;
      const element = document.createElement('div');
      element.style.padding = '20px';
      element.style.backgroundColor = 'white';
      element.style.width = '800px';

      const totalDamages = (negotiation.past_medical_bills || 0) +
                          (negotiation.future_medical_bills || 0) +
                          (negotiation.lcp || 0) +
                          (negotiation.lost_wages || 0) +
                          (negotiation.loss_earning_capacity || 0);

      element.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h1 style="margin: 0 0 10px 0;">⚖️ Negotiation Report</h1>
          <h2 style="margin: 0 0 20px 0; color: #666;">${negotiation.name}</h2>
        </div>

        <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5;">
          <h3>Case Information</h3>
          <p><strong>Status:</strong> ${negotiation.status}</p>
          <p><strong>Plaintiff Attorney:</strong> ${negotiation.plaintiff_attorney || 'N/A'}</p>
          <p><strong>Defendant Attorney:</strong> ${negotiation.defendant_attorney || 'N/A'}</p>
          <p><strong>Mediator:</strong> ${negotiation.mediator || 'N/A'}</p>
          <p><strong>Judge:</strong> ${negotiation.judge || 'N/A'}</p>
          <p><strong>Venue:</strong> ${negotiation.venue || 'N/A'}</p>
          <p><strong>Defendant Type:</strong> ${negotiation.defendant_type || 'N/A'}</p>
        </div>

        ${negotiation.primary_coverage_limit || negotiation.umbrella_coverage_limit || negotiation.uim_coverage_limit ? `
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5;">
            <h3>Insurance Coverage</h3>
            ${negotiation.primary_coverage_limit ? `
              <div style="margin-bottom: 10px;">
                <p style="font-weight: 600; margin-bottom: 5px;">Primary Insurance</p>
                <p><strong>Limit:</strong> $${negotiation.primary_coverage_limit.toLocaleString()}</p>
                ${negotiation.primary_insurer_name ? `<p><strong>Insurer:</strong> ${negotiation.primary_insurer_name}</p>` : ''}
                ${negotiation.primary_adjuster_name ? `<p><strong>Adjuster:</strong> ${negotiation.primary_adjuster_name}</p>` : ''}
              </div>
            ` : ''}
            ${negotiation.umbrella_coverage_limit ? `
              <div style="margin-bottom: 10px;">
                <p style="font-weight: 600; margin-bottom: 5px;">Umbrella / Excess Coverage</p>
                <p><strong>Limit:</strong> $${negotiation.umbrella_coverage_limit.toLocaleString()}</p>
                ${negotiation.umbrella_insurer_name ? `<p><strong>Insurer:</strong> ${negotiation.umbrella_insurer_name}</p>` : ''}
                ${negotiation.umbrella_adjuster_name ? `<p><strong>Adjuster:</strong> ${negotiation.umbrella_adjuster_name}</p>` : ''}
              </div>
            ` : ''}
            ${negotiation.uim_coverage_limit ? `
              <div style="margin-bottom: 10px;">
                <p style="font-weight: 600; margin-bottom: 5px;">UM/UIM Coverage</p>
                <p><strong>Limit:</strong> $${negotiation.uim_coverage_limit.toLocaleString()}</p>
                ${negotiation.uim_insurer_name ? `<p><strong>Insurer:</strong> ${negotiation.uim_insurer_name}</p>` : ''}
                ${negotiation.uim_adjuster_name ? `<p><strong>Adjuster:</strong> ${negotiation.uim_adjuster_name}</p>` : ''}
              </div>
            ` : ''}
          </div>
        ` : (negotiation.coverage ? `
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5;">
            <h3>Insurance Coverage</h3>
            <p><strong>Coverage:</strong> ${negotiation.coverage}</p>
          </div>
        ` : '')}

        <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5;">
          <h3>Damages</h3>
          <p><strong>Past Medical Bills:</strong> $${(negotiation.past_medical_bills || 0).toLocaleString()}</p>
          <p><strong>Future Medical Bills:</strong> $${(negotiation.future_medical_bills || 0).toLocaleString()}</p>
          <p><strong>Lost Wages:</strong> $${(negotiation.lost_wages || 0).toLocaleString()}</p>
          <p><strong>Loss of Earning Capacity:</strong> $${(negotiation.lcp || 0).toLocaleString()}</p>
          <p><strong>Loss Earning Capacity:</strong> $${(negotiation.loss_earning_capacity || 0).toLocaleString()}</p>
          <p style="border-top: 2px solid #333; padding-top: 10px; margin-top: 10px;">
            <strong>Total Damages: $${totalDamages.toLocaleString()}</strong>
          </p>
        </div>

        ${negotiation.injury_description ? `
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5;">
            <h3>Injury Description</h3>
            <p>${negotiation.injury_description}</p>
          </div>
        ` : ''}

        ${negotiation.moves && negotiation.moves.length > 0 ? `
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5;">
            <h3>Move History</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #ddd;">
                  <th style="border: 1px solid #999; padding: 8px; text-align: left;">Date</th>
                  <th style="border: 1px solid #999; padding: 8px; text-align: left;">Party</th>
                  <th style="border: 1px solid #999; padding: 8px; text-align: left;">Type</th>
                  <th style="border: 1px solid #999; padding: 8px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${negotiation.moves.map(move => `
                  <tr>
                    <td style="border: 1px solid #ccc; padding: 8px;">${new Date(move.timestamp).toLocaleDateString()}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${move.party}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${move.type}</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">$${parseFloat(move.amount).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${negotiation.analytics ? `
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5;">
            <h3>Analytics</h3>
            <p><strong>Current Midpoint:</strong> ${negotiation.analytics.midpoint ? '$' + negotiation.analytics.midpoint.toLocaleString() : 'N/A'}</p>
            <p><strong>Predicted Settlement:</strong> ${negotiation.analytics.predicted_settlement ? '$' + negotiation.analytics.predicted_settlement.toLocaleString() : 'N/A'}</p>
            <p><strong>Momentum:</strong> ${negotiation.analytics.momentum ? negotiation.analytics.momentum.toFixed(1) + '%' : 'N/A'}</p>
            <p><strong>Convergence Rate:</strong> ${negotiation.analytics.convergence_rate ? negotiation.analytics.convergence_rate.toFixed(1) + '%' : 'N/A'}</p>
            <p><strong>Prediction Confidence:</strong> ${negotiation.analytics.confidence ? negotiation.analytics.confidence.toFixed(1) + '%' : 'N/A'}</p>
          </div>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ccc; color: #999; font-size: 12px;">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Negotiation Engine v1.0</p>
        </div>
      `;

      document.body.appendChild(element);
      const canvas = await html2canvas(element);
      document.body.removeChild(element);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${negotiation.name}-report.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      className="btn btn-info" 
      onClick={handleExportPdf} 
      title="Export as PDF"
      disabled={isExporting}
    >
      {isExporting ? '⏳ Generating...' : '📄 PDF'}
    </button>
  );
}

export default PdfExport;
