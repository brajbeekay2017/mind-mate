import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  LineController,
} from 'chart.js';

// Register all Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TrendChart({ entries = [] }){
  const canvasRef = useRef();
  const chartRef = useRef(null);
  
  useEffect(()=>{
    // Destroy previous chart if it exists
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (!canvasRef.current || entries.length === 0) {
      return;
    }
    
    try {
      const ctx = canvasRef.current.getContext('2d');
      const labels = entries.map((e, i) => `Entry ${i + 1}`);
      const moodData = entries.map(e => e.mood);
      
      chartRef.current = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{ 
            label: 'Mood Score', 
            data: moodData, 
            borderColor: '#6FA8F1', 
            backgroundColor: 'rgba(111,168,241,0.12)', 
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#6FA8F1',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          indexAxis: undefined,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: { enabled: true }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 5,
              title: { display: true, text: 'Mood' }
            }
          }
        }
      });
      
      return () => {
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
      };
    } catch (err) {
      console.error('Chart error:', err);
    }
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div style={{height: 220, width: '100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#888', fontSize:'14px'}}>
        No data yet. Log a mood to see trends.
      </div>
    );
  }

  return (
    <div style={{height: 220, width: '100%', position: 'relative'}}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}
