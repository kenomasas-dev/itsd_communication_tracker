import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
);

export const pendingData = {
  labels: ['Pending', 'Completed'],
  datasets: [
    {
      data: [30, 70],
      backgroundColor: ['#2b6ef6', '#e6eef8'],
      borderWidth: 0,
    },
  ],
};

export const priorityData = {
  labels: ['High', 'Medium', 'Low'],
  datasets: [
    {
      data: [40, 35, 25],
      backgroundColor: ['#f6c94a', '#7dd3fc', '#bfe6b9'],
      borderWidth: 0,
    },
  ],
};

export const directionData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [
    {
      label: 'Incoming',
      data: [5, 15, 10, 20, 12],
      borderColor: '#2b6ef6',
      backgroundColor: 'rgba(43,110,246,0.08)',
      tension: 0.3,
    },
    {
      label: 'Outgoing',
      data: [8, 12, 18, 10, 15],
      borderColor: '#f6c94a',
      backgroundColor: 'rgba(246,201,74,0.08)',
      tension: 0.3,
    },
  ],
};

export const topOfficesData = {
  labels: ['GSO', 'MIS', 'Accounting', 'HR', 'Admin', 'Legal', 'ITSD', 'BFP', 'PNP'],
  datasets: [
    {
      label: 'Count',
      data: [5,8,7,9,6,10,4,3,2,1],
      backgroundColor: '#163a6b',
    },
  ],
};

export const donutOptions = {
  plugins: { legend: { position: 'right' } },
  maintainAspectRatio: false,
};

export const lineOptions = {
  plugins: { legend: { position: 'top' } },
  maintainAspectRatio: false,
  scales: {
    x: {
      offset: false,
    },
    y: {
      beginAtZero: true,
      max: 20,
      ticks: {
        stepSize: 5,
      },
    },
  },
};

export const barOptions = { maintainAspectRatio: false, plugins: { legend: { display: false } } };

export default ChartJS;
