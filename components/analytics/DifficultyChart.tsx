"use client"

import { useMemo } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ProblemMetadata } from '@/lib/types/problems'

interface CorrectRateChartProps {
  problems: ProblemMetadata[]
}

const chartConfig = {
  count: {
    label: "문제 수",
    color: "#FF00A1",
  },
} satisfies ChartConfig

export function CorrectRateChart({ problems }: CorrectRateChartProps) {
  const chartData = useMemo(() => {
    // Create data points for 0, 10, 20, 30, 40, 50, 60, 70, 80, 90 (no 100)
    const dataPoints = Array.from({ length: 10 }, (_, i) => ({
      percentage: i * 10,
      count: 0
    }))

    problems.forEach(problem => {
      if (problem.correct_rate !== null && problem.correct_rate !== undefined) {
        // Floor grouping: 0-9→0, 10-19→10, ..., 90-100→90
        const flooredRate = Math.floor(problem.correct_rate / 10) * 10
        const index = Math.min(flooredRate / 10, 9) // Max index is 9 (for 90)
        dataPoints[index].count++
      }
    })

    return dataPoints
  }, [problems])

  const totalProblems = problems.length
  const averageCorrectRate = problems.length > 0
    ? Math.round(problems.reduce((sum, p) => sum + (p.correct_rate || 0), 0) / problems.length)
    : 0

  // Don't render chart if no problems
  if (totalProblems === 0) {
    return null
  }

  return (
    <div className="w-full pb-4 border-b border-gray-200">
      <div className="mb-3">
        <h3 className="text-sm font-medium">정답률 분포</h3>
        <p className="text-xs text-gray-600">
          {totalProblems}문제 • 평균 정답률 {averageCorrectRate}%
        </p>
      </div>

      <ChartContainer config={chartConfig} className="h-[120px] w-full">
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: 0,
            right: 0,
            top: 8,
            bottom: 8,
          }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="percentage"
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => value}
            type="number"
            scale="linear"
            domain={[0, 90]}
            ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90]}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            tick={{ fontSize: 11 }}
            width={20}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent
              hideLabel
              formatter={(value, name) => [
                `${value}개`,
                chartConfig[name as keyof typeof chartConfig]?.label || name
              ]}
              labelFormatter={(label) => `정답률 ${label}%`}
              className="bg-white border border-gray-200 shadow-md"
            />}
          />
          <Line
            dataKey="count"
            type="monotone"
            stroke="#FF00A1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#FF00A1" }}
            connectNulls={true}
          />
        </LineChart>
      </ChartContainer>
    </div>
  )
}