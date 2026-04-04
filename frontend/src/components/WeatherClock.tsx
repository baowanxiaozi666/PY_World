import React, { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind } from 'lucide-react';

interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
  conditionCn: string;
  windDirection: string;
  city: string;
}

const WeatherClock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/weather')
      .then(res => res.json())
      .then(data => {
        if (data.code === 200) setWeather(data.data);
      })
      .catch(() => console.log('Weather API offline'));
  }, []);

  const formatDate = () => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const year = time.getFullYear();
    const month = String(time.getMonth() + 1).padStart(2, '0');
    const day = String(time.getDate()).padStart(2, '0');
    const dayName = days[time.getDay()];
    return `${year}-${month}-${day} ${dayName}`;
  };

  const formatTime = () => {
    const h = String(time.getHours()).padStart(2, '0');
    const m = String(time.getMinutes()).padStart(2, '0');
    const s = String(time.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getWeatherIcon = () => {
    if (!weather) return '☀️';
    const condition = weather.condition.toLowerCase();
    if (condition.includes('cloud')) return '☁️';
    if (condition.includes('rain')) return '🌧️';
    if (condition.includes('snow')) return '❄️';
    return '☀️';
  };

  return (
    <div className="bg-anime-card backdrop-blur-md rounded-2xl p-4 border border-anime-accent/20 shadow-lg min-w-[280px]">
      <div className="flex items-center justify-between text-sm text-anime-text/80 mb-2">
        <span>{formatDate()}</span>
        {weather && (
          <div className="flex items-center gap-2">
            <span>{getWeatherIcon()} {weather.conditionCn}</span>
            <span>{weather.temperature}°C</span>
            <Droplets size={14} className="inline" />
            <span>{weather.humidity}%</span>
          </div>
        )}
      </div>

      <div className="text-4xl font-mono font-bold text-anime-text text-center my-3 tracking-wider">
        {formatTime()}
      </div>

      <div className="flex items-center justify-between text-sm text-anime-text/70">
        {weather && (
          <>
            <div className="flex items-center gap-1">
              <Wind size={14} />
              <span>{weather.windDirection}</span>
            </div>
            <span>{weather.city}</span>
          </>
        )}
        <span className="ml-auto">{time.getHours() >= 12 ? 'PM' : 'AM'}</span>
      </div>
    </div>
  );
};

export default WeatherClock;
