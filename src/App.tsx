/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

interface WeightResult {
  baseHamwiWeightLbs: number;
  adjustedFrameWeightLbs: number;
  minHealthyWeightLbs: number;
  maxHealthyWeightLbs: number;
  bmiAtMinWeight: number;
  bmiAtMaxWeight: number;
  bmiHealthyMinLbs: number;
  bmiHealthyMaxLbs: number;
  healthStatus: 'within' | 'partially_outside' | 'fully_outside';
  healthStatusLabel: string;
  bmiClassification: string;
}

export default function App() {
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<number>(25);
  const [heightFeet, setHeightFeet] = useState<number>(5);
  const [heightInches, setHeightInches] = useState<number>(7);
  const [boneStructure, setBoneStructure] = useState<'small' | 'medium' | 'large'>('medium');
  const [usageCount, setUsageCount] = useState<number>(0);
  const [recommendedWeight, setRecommendedWeight] = useState<WeightResult | null>(null);
  const [includeBmiComparison, setIncludeBmiComparison] = useState<boolean>(false);

  // Fetch initial usage count
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/usage');
        const data = await response.json();
        setUsageCount(data.count);
      } catch (error) {
        console.error('Error fetching usage count:', error);
      }
    };
    fetchUsage();
  }, []);

  useEffect(() => {
    // Only calculate if all inputs are valid numbers
    if (age <= 0 || heightFeet < 0 || heightInches < 0 || heightInches > 11) {
      setRecommendedWeight(null);
      return;
    }

    let baseHamwiWeightLbs: number;
    const totalInches = (heightFeet * 12) + heightInches;
    const heightInMeters = totalInches * 0.0254; // 1 inch = 0.0254 meters;

    // Hamwi Formula for Ideal Body Weight (simplified for adults)
    // Men: 106 lbs for first 5 feet + 6 lbs for each inch over 5 feet
    // Women: 100 lbs for first 5 feet + 5 lbs for each inch over 5 feet
    // If height is below 5 feet, subtract accordingly.
    const baseHeightInches = 60; // 5 feet

    if (totalInches < baseHeightInches) {
      if (sex === 'male') {
        baseHamwiWeightLbs = 106 - (baseHeightInches - totalInches) * 6;
      } else {
        baseHamwiWeightLbs = 100 - (baseHeightInches - totalInches) * 5;
      }
    } else {
      if (sex === 'male') {
        baseHamwiWeightLbs = 106 + (totalInches - baseHeightInches) * 6;
      } else {
        baseHamwiWeightLbs = 100 + (totalInches - baseHeightInches) * 5;
      }
    }

    let adjustedFrameWeightLbs = baseHamwiWeightLbs;
    if (boneStructure === 'small') {
      adjustedFrameWeightLbs *= 0.93; // -7%
    } else if (boneStructure === 'large') {
      adjustedFrameWeightLbs *= 1.07; // +7%
    }

    const rangePercentage = 0.08; // +/- 8%
    const minHealthyWeightLbs = adjustedFrameWeightLbs * (1 - rangePercentage);
    const maxHealthyWeightLbs = adjustedFrameWeightLbs * (1 + rangePercentage);

    // Calculate BMI for the Hamwi-based range
    const bmiAtMinWeight = minHealthyWeightLbs / (heightInMeters * heightInMeters);
    const bmiAtMaxWeight = maxHealthyWeightLbs / (heightInMeters * heightInMeters);

    // Calculate BMI-based healthy weight range (18.5-24.9 BMI)
    const bmiHealthyMinLbs = 18.5 * (heightInMeters * heightInMeters) * 2.20462; // Convert kg to lbs
    const bmiHealthyMaxLbs = 24.9 * (heightInMeters * heightInMeters) * 2.20462; // Convert kg to lbs

    // Determine health status
    // Calculate BMI classification at the midpoint weight
    const midpointWeightLbs = (minHealthyWeightLbs + maxHealthyWeightLbs) / 2;
    const midpointWeightKg = midpointWeightLbs / 2.20462;
    const bmiAtMidpoint = midpointWeightKg / (heightInMeters * heightInMeters);

    let bmiClassification: string;
    if (bmiAtMidpoint < 18.5) {
      bmiClassification = 'Underweight';
    } else if (bmiAtMidpoint >= 18.5 && bmiAtMidpoint <= 24.9) {
      bmiClassification = 'Normal';
    } else if (bmiAtMidpoint >= 25 && bmiAtMidpoint <= 29.9) {
      bmiClassification = 'Overweight';
    } else {
      bmiClassification = 'Obese';
    }

    let healthStatus: 'within' | 'partially_outside' | 'fully_outside' = 'within';
    let healthStatusLabel = 'Within Standard BMI Range';

    if (bmiAtMinWeight > 24.9 || bmiAtMaxWeight < 18.5) {
      healthStatus = 'fully_outside';
      healthStatusLabel = 'Outside Standard BMI Range';
    } else if (bmiAtMinWeight < 18.5 || bmiAtMaxWeight > 24.9) {
      healthStatus = 'partially_outside';
      healthStatusLabel = 'Partially Outside Standard BMI Range';
    }

    setRecommendedWeight({
      baseHamwiWeightLbs,
      adjustedFrameWeightLbs,
      minHealthyWeightLbs,
      maxHealthyWeightLbs,
      bmiAtMinWeight,
      bmiAtMaxWeight,
      bmiHealthyMinLbs,
      bmiHealthyMaxLbs,
      healthStatus,
      healthStatusLabel,
      bmiClassification,
    });

    // Increment usage counter only if inputs are valid and age >= 18
    if (age >= 18 && heightFeet > 0 && heightInches >= 0) {
      const incrementUsage = async () => {
        try {
          const response = await fetch('/api/usage/increment', { method: 'POST' });
          const data = await response.json();
          setUsageCount(data.count);
        } catch (error) {
          console.error('Error incrementing usage count:', error);
        }
      };
      incrementUsage();
    }
  }, [sex, age, heightFeet, heightInches, boneStructure]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-300 to-pink-400 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-purple-700">Personalized Healthy Weight Range</h1>
        <p className="text-center text-gray-600 mb-6">Based on height, sex, and body frame size using the Hamwi formula.</p>

        <div className="mb-4">
          <label htmlFor="sex" className="block text-gray-700 text-sm font-bold mb-2">Sex:</label>
          <select
            id="sex"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={sex}
            onChange={(e) => setSex(e.target.value as 'male' | 'female')}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="age" className="block text-gray-700 text-sm font-bold mb-2">Age (years):</label>
          <input
            type="number"
            id="age"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            min="18"
          />
          <p className="text-xs text-gray-500 mt-1">For adults 18 and older.</p>
        </div>

        <div className="mb-4">
          <label htmlFor="boneStructure" className="block text-gray-700 text-sm font-bold mb-2">Bone Structure:</label>
          <select
            id="boneStructure"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={boneStructure}
            onChange={(e) => setBoneStructure(e.target.value as 'small' | 'medium' | 'large')}
          >
            <option value="small">Small Frame</option>
            <option value="medium">Medium Frame</option>
            <option value="large">Large Frame</option>
          </select>
        </div>

        <div className="mb-6 flex space-x-4">
          <div className="w-1/2">
            <label htmlFor="heightFeet" className="block text-gray-700 text-sm font-bold mb-2">Height (feet):</label>
            <input
              type="number"
              id="heightFeet"
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={heightFeet}
              onChange={(e) => setHeightFeet(Number(e.target.value))}
              min="0"
            />
          </div>
          <div className="w-1/2">
            <label htmlFor="heightInches" className="block text-gray-700 text-sm font-bold mb-2">Height (inches):</label>
            <input
              type="number"
              id="heightInches"
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={heightInches}
              onChange={(e) => setHeightInches(Number(e.target.value))}
              min="0"
              max="11"
            />
          </div>
        </div>



        {recommendedWeight && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h2 className="text-2xl font-bold text-center mb-1 text-purple-700">Estimated Healthy Weight Range</h2>
            <p className="text-center text-sm text-gray-500 mb-4">Reference Estimate, Not Medical Advice</p>

            <h3 className="text-xl font-bold text-purple-600 mb-3">Your Estimated Range</h3>
            <div className="bg-pink-100 text-pink-800 rounded-lg p-4 mb-4 border border-pink-200">
              <p className="mb-2"><span className="font-bold">Base Hamwi Weight:</span> {recommendedWeight.baseHamwiWeightLbs.toFixed(1)} lbs</p>
              <p className="mb-2"><span className="font-bold">Frame-Adjusted Weight:</span> {recommendedWeight.adjustedFrameWeightLbs.toFixed(1)} lbs</p>
              <div className="my-3 h-px bg-pink-200"></div>
              <p className="text-lg font-bold mb-2">Range: {recommendedWeight.minHealthyWeightLbs.toFixed(1)} lbs - {recommendedWeight.maxHealthyWeightLbs.toFixed(1)} lbs</p>
              <p className="text-sm text-pink-700 mb-1">BMI at Low End: {recommendedWeight.bmiAtMinWeight.toFixed(1)} | BMI at High End: {recommendedWeight.bmiAtMaxWeight.toFixed(1)}</p>
              <p className="text-sm text-pink-700"><span className="font-bold">Midpoint BMI Classification:</span> {recommendedWeight.bmiClassification}</p>
            </div>

            {/* Health Indicator */}
            <div className={`p-3 rounded-lg text-center mb-6
              ${recommendedWeight.healthStatus === 'within' ? 'bg-green-100 text-green-800 border border-green-200' :
                recommendedWeight.healthStatus === 'partially_outside' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                'bg-red-100 text-red-800 border border-red-200'}
            `}>
              <p className="font-bold">{recommendedWeight.healthStatusLabel}</p>
            </div>

            {/* Advanced Mode Toggle */}
            <div className="mb-4 flex items-center justify-center">
              <input
                type="checkbox"
                id="includeBmiComparison"
                className="mr-2 accent-purple-600"
                checked={includeBmiComparison}
                onChange={(e) => setIncludeBmiComparison(e.target.checked)}
              />
              <label htmlFor="includeBmiComparison" className="text-gray-700">Include BMI-based comparison</label>
            </div>

            {includeBmiComparison && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-xl font-bold text-center mb-3 text-purple-600">BMI Analysis</h3>
                <div className="bg-blue-100 text-blue-800 rounded-lg p-4 border border-blue-200">
                  <p className="mb-2"><span className="font-bold">Standard BMI (18.5-24.9) Weight Range:</span></p>
                  <p>{recommendedWeight.bmiHealthyMinLbs.toFixed(1)} lbs - {recommendedWeight.bmiHealthyMaxLbs.toFixed(1)} lbs</p>
                  <p className="mt-3 text-sm italic">This range represents a statistically healthy weight for your height, irrespective of body frame.</p>
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-gray-600 text-sm italic">
              This estimate is based on population formulas and does not account for muscle mass, body fat percentage, medical conditions, or individual health goals. Healthy weight varies by individual. For medical advice, consult a qualified healthcare professional.
            </p>
          </div>
        )}

        {/* How is this calculated? Section */}
        <details className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <summary className="font-bold text-gray-700 cursor-pointer">How is this calculated?</summary>
          <div className="mt-3 text-gray-600 text-sm leading-relaxed">
            <h4 className="font-semibold mb-1">Hamwi Formula Basics:</h4>
            <p className="mb-2">The Hamwi formula provides a reference weight estimate based on height and sex. It starts with a base weight for 5 feet of height and adds a specific amount for each additional inch.</p>

            <h4 className="font-semibold mb-1">Frame Size Adjustment:</h4>
            <p className="mb-2">This calculator adjusts the Hamwi estimate by &plusmn;7% for small or large body frames, respectively, to better personalize the initial reference weight.</p>

            <h4 className="font-semibold mb-1">Healthy Weight Range:</h4>
            <p className="mb-2">A &plusmn;8% range is applied to the frame-adjusted Hamwi weight to account for natural variations in healthy body composition.</p>

            <h4 className="font-semibold mb-1">BMI Comparison Method:</h4>
            <p className="mb-2">Body Mass Index (BMI) is a common screening tool. This calculator provides the weight range corresponding to a standard BMI of 18.5-24.9 for your height, allowing for comparison with the Hamwi estimate.</p>
            <p>This tool currently uses the Hamwi formula as a reference method. Future versions may incorporate additional health metrics for more personalized estimates.</p>
          </div>
        </details>

        <div className="mt-4 text-center text-gray-600 text-sm">
          App used: {usageCount} times
        </div>
        <p className="mt-8 text-center text-gray-500 text-xs">
          © 2026 Brandon Smith<br/>
          Educational use only.
        </p>
      </div>
    </div>
  );
}
