'use client';
import React, { useState } from 'react';
import {
  Button,
  HStack,
  Input,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import { subDays, subWeeks, subMonths, subYears, format } from 'date-fns';
import useColorModeStyles from '@/app/utils/useColorModeStyles';

interface DateRangePickerProps {
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  zones: { id: number; name: string }[];
  selectedZone: number | null;
  setSelectedZone: (id: number) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  setStartDate,
  setEndDate,
  zones: _zones,
  selectedZone: _selectedZone,
  setSelectedZone: _setSelectedZone,
}) => {
  const { textColor } = useColorModeStyles();
  const today = new Date();
  const formattedToday = format(today, 'yyyy-MM-dd');

  const [manualStartDate, setManualStartDate] = useState<string>('');
  const [manualEndDate, setManualEndDate] = useState<string>('');

  const handleDateRangeClick = (days: number) => {
    const startDate = format(subDays(today, days), 'yyyy-MM-dd');
    setStartDate(startDate);
    setEndDate(formattedToday);
  };

  const handleWeeksClick = (weeks: number) => {
    const startDate = format(subWeeks(today, weeks), 'yyyy-MM-dd');
    setStartDate(startDate);
    setEndDate(formattedToday);
  };

  const handleMonthsClick = (months: number) => {
    const startDate = format(subMonths(today, months), 'yyyy-MM-dd');
    setStartDate(startDate);
    setEndDate(formattedToday);
  };

  const handleYearsClick = (years: number) => {
    const startDate = format(subYears(today, years), 'yyyy-MM-dd');
    setStartDate(startDate);
    setEndDate(formattedToday);
  };

  const handleManualDateSelection = () => {
    if (manualStartDate && manualEndDate) {
      setStartDate(manualStartDate);
      setEndDate(manualEndDate);
    }
  };

  const showManualDatePicker = useBreakpointValue({ base: false, lg: true });

  return (
    <HStack
      spacing={2}
      overflow="hidden" // Prevent overflow
      justifyContent="space-between"
      width="100%"
    >
      <HStack>
        <Button onClick={() => handleDateRangeClick(1)}>1d</Button>
        <Button onClick={() => handleDateRangeClick(3)}>3d</Button>
        <Button onClick={() => handleWeeksClick(1)}>1 w</Button>
        <Button onClick={() => handleWeeksClick(2)}>2 w</Button>
        <Button onClick={() => handleMonthsClick(1)}>1 m</Button>
        {showManualDatePicker && (
          <Button onClick={() => handleMonthsClick(3)}>3 m</Button>
        )}
        {showManualDatePicker && (
          <Button onClick={() => handleMonthsClick(6)}>6 m</Button>
        )}
        {showManualDatePicker && (
          <Button onClick={() => handleYearsClick(1)}>1 y</Button>
        )}
      </HStack>

      {showManualDatePicker && (
        <HStack alignItems="center" gap="1" ml="auto" mr={2} flexWrap="wrap">
          <Text color={textColor}>De:</Text>
          <Input
            color={textColor}
            type="date"
            maxW="160px" // ✅ Keep narrow
            value={manualStartDate}
            onChange={(e) => setManualStartDate(e.target.value)}
          />
          <Text color={textColor}>à:</Text>
          <Input
            color={textColor}
            type="date"
            maxW="160px"
            value={manualEndDate}
            onChange={(e) => setManualEndDate(e.target.value)}
          />
          <Button onClick={handleManualDateSelection} whiteSpace="nowrap">
            <Text color={textColor} px={2}>
              Appliquer
            </Text>
          </Button>
        </HStack>
      )}
    </HStack>
  );
};

export default DateRangePicker;
