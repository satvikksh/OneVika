'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Clock,
  Zap,
  DollarSign,
  Activity,
  Eye,
  Download,
  RefreshCw,
  ChevronDown,
  MoreVertical,
  Shield,
  Smartphone,
} from 'lucide-react';

// Mock data for charts
const userGrowthData = [
  { month: 'Jan', users: 4000, active: 2400 },
  { month: 'Feb', users: 4500, active: 2800 },
  { month: 'Mar', users: 5200, active: 3200 },
  { month: 'Apr', users: 6200, active: 4200 },
  { month: 'May', users: 7800, active: 5200 },
  { month: 'Jun', users: 9200, active: 6500 },
  { month: 'Jul', users: 12450, active: 8920 },
];

const engagementData = [
  { metric: 'Sessions', value: 24500 },
  { metric: 'Page Views', value: 189000 },
  { metric: 'Avg Duration', value: 345 },
  { metric: 'Bounce Rate', value: 28 },
];

const trafficSources = [
  { name: 'Direct', value: 35, color: '#8884d8' },
  { name: 'Social', value: 25, color: '#82ca9d' },
  { name: 'Search', value: 20, color: '#ffc658' },
  { name: 'Referral', value: 15, color: '#ff8042' },
  { name: 'Email', value: 5, color: '#0088fe' },
];

const deviceData = [
  { name: 'Mobile', value: 65 },
  { name: 'Desktop', value: 30 },
  { name: 'Tablet', value: 5 },
];

const realTimeActivity = [
  { time: '10:00', active: 1200 },
  { time: '11:00', active: 1450 },
  { time: '12:00', active: 1890 },
  { time: '13:00', active: 2100 },
  { time: '14:00', active: 1890 },
  { time: '15:00', active: 1600 },
  { time: '16:00', active: 1450 },
];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMetric, setActiveMetric] = useState('users');
  
  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real app, this would fetch new data
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const keyMetrics = [
    {
      title: "Total Users",
      value: "12,450",
      change: "+18.2%",
      icon: <Users className="w-6 h-6" />,
      color: "from-blue-500 to-cyan-500",
      subtext: "From last month",
    },
    {
      title: "Active Users",
      value: "8,920",
      change: "+12.4%",
      icon: <Activity className="w-6 h-6" />,
      color: "from-emerald-500 to-green-500",
      subtext: "Currently online",
    },
    {
      title: "Avg. Session",
      value: "4m 32s",
      change: "+2.1%",
      icon: <Clock className="w-6 h-6" />,
      color: "from-purple-500 to-pink-500",
      subtext: "Time spent",
    },
    {
      title: "Conversion",
      value: "3.2%",
      change: "+0.8%",
      icon: <TrendingUp className="w-6 h-6" />,
      color: "from-orange-500 to-red-500",
      subtext: "Goal completion",
    },
    {
      title: "Revenue",
      value: "$24,580",
      change: "+22.5%",
      icon: <DollarSign className="w-6 h-6" />,
      color: "from-green-500 to-emerald-500",
      subtext: "This month",
    },
    {
      title: "Performance",
      value: "99.9%",
      change: "+0.1%",
      icon: <Zap className="w-6 h-6" />,
      color: "from-yellow-500 to-amber-500",
      subtext: "System uptime",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-slate-100 px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-gray-400">
              Real-time insights and performance metrics
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {keyMetrics.map((metric, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${metric.color}`}>
                  {metric.icon}
                </div>
                <span className={`text-sm font-semibold ${
                  metric.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                }`}>
                  {metric.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-1">{metric.value}</h3>
              <p className="text-sm text-gray-400">{metric.title}</p>
              <p className="text-xs text-gray-500 mt-2">{metric.subtext}</p>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">User Growth</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveMetric('users')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    activeMetric === 'users'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-gray-300'
                  }`}
                >
                  Total
                </button>
                <button
                  onClick={() => setActiveMetric('active')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    activeMetric === 'active'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-gray-300'
                  }`}
                >
                  Active
                </button>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stackId="1"
                    stroke="#06b6d4"
                    fill="url(#colorUsers)"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="active"
                    stackId="2"
                    stroke="#10b981"
                    fill="url(#colorActive)"
                    fillOpacity={0.3}
                  />
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Engagement Metrics</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="metric" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }}
                    labelStyle={{ color: '#f1f5f9' }}
                    formatter={(value) => [value, 'Value']}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Second Row Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Traffic Sources */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Traffic Sources</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficSources}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {trafficSources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device Distribution */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Device Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#06b6d4" />
                    <Cell fill="#10b981" />
                    <Cell fill="#8b5cf6" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center space-x-4 mt-4">
              {deviceData.map((device, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: index === 0 ? '#06b6d4' : 
                                     index === 1 ? '#10b981' : '#8b5cf6',
                    }}
                  />
                  <span className="text-sm text-gray-300">{device.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Activity */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Real-time Activity</h2>
              <div className="flex items-center space-x-2 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm">Live</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={realTimeActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="active"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">2,100</p>
                <p className="text-sm text-gray-400">Active users right now</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analytics Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Analytics */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">User Analytics</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'New Registrations', value: '1,234', change: '+12%' },
                { label: 'Returning Users', value: '4,567', change: '+8%' },
                { label: 'User Retention', value: '78%', change: '+5%' },
                { label: 'Avg. Session Time', value: '4:32', change: '+2%' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-slate-700/50 rounded-lg transition-colors">
                  <span className="text-gray-300">{item.label}</span>
                  <div className="flex items-center space-x-4">
                    <span className="font-semibold text-white">{item.value}</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      item.change.startsWith('+') 
                        ? 'bg-green-900/30 text-green-400' 
                        : 'bg-red-900/30 text-red-400'
                    }`}>
                      {item.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-white">Performance Metrics</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Server Response</span>
                  <span>142ms</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>API Latency</span>
                  <span>89ms</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '98%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Database Queries</span>
                  <span>2.1k/s</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '82%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Cache Hit Rate</span>
                  <span>94%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-cyan-500 h-2 rounded-full" style={{ width: '94%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Predictive Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security Analytics */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Shield className="w-5 h-5 text-red-400" />
              <h2 className="text-xl font-bold text-white">Security Analytics</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white mb-2">23</div>
                <div className="text-sm text-gray-400">Failed Logins</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white mb-2">0</div>
                <div className="text-sm text-gray-400">Security Threats</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white mb-2">99.9%</div>
                <div className="text-sm text-gray-400">System Uptime</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white mb-2">100%</div>
                <div className="text-sm text-gray-400">SSL Encryption</div>
              </div>
            </div>
          </div>

          {/* Predictive Analytics */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-6">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white">Predictive Analytics</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <div>
                  <p className="font-medium text-white">Next 30 Days Growth</p>
                  <p className="text-sm text-gray-400">Projected user increase</p>
                </div>
                <span className="text-2xl font-bold text-green-400">+15%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <div>
                  <p className="font-medium text-white">Revenue Forecast</p>
                  <p className="text-sm text-gray-400">Next quarter projection</p>
                </div>
                <span className="text-2xl font-bold text-cyan-400">$28,500</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <div>
                  <p className="font-medium text-white">Peak Load Prediction</p>
                  <p className="text-sm text-gray-400">Expected max users</p>
                </div>
                <span className="text-2xl font-bold text-yellow-400">15,200</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between text-sm text-gray-500">
            <div>
              © {new Date().getFullYear()} Skimagination Analytics Dashboard
            </div>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Systems Operational</span>
              </span>
              <span>Last updated: Just now</span>
              <span>Version 2.1.4</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}