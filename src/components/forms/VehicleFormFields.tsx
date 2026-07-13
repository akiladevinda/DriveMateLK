import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';

import { SuggestionInput } from '@/components/forms/SuggestionInput';
import { FormInput } from '@/components/ui';
import {
  getMakeHint,
  getMakePlaceholder,
  getModelPlaceholder,
} from '@/constants/vehicle-catalog';
import {
  PHASE1_VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  type Phase1VehicleType,
} from '@/constants/vehicles';
import {
  useMakeSuggestions,
  useModelSuggestions,
} from '@/hooks/use-vehicle-suggestions';
import type { VehicleCreateInput } from '@/schemas/vehicle';
import { useTheme } from '@/theme';
import { brand, minTouchTarget, radii, spacing, typography } from '@/theme/tokens';

type VehicleFormFieldsProps = {
  control: Control<VehicleCreateInput>;
  errors: FieldErrors<VehicleCreateInput>;
  setValue?: UseFormSetValue<VehicleCreateInput>;
  compact?: boolean;
};

function usePhase1VehicleType(control: Control<VehicleCreateInput>): Phase1VehicleType {
  const value = useWatch({ control, name: 'vehicle_type' }) ?? 'car';
  return (
    PHASE1_VEHICLE_TYPES.includes(value as Phase1VehicleType) ? value : 'car'
  ) as Phase1VehicleType;
}

function MakeField({
  control,
  error,
  vehicleType,
}: {
  control: Control<VehicleCreateInput>;
  error?: string;
  vehicleType: Phase1VehicleType;
}) {
  const makeValue = useWatch({ control, name: 'make' }) ?? '';
  const [focused, setFocused] = useState(false);
  const { suggestions, loading } = useMakeSuggestions(makeValue, focused, vehicleType);

  return (
    <Controller
      control={control}
      name="make"
      render={({ field: { onChange, onBlur, value } }) => (
        <SuggestionInput
          autoCapitalize="words"
          autoCorrect={false}
          error={error}
          hint={getMakeHint(vehicleType)}
          label="Make"
          loading={loading}
          placeholder={getMakePlaceholder(vehicleType)}
          suggestions={suggestions}
          value={value}
          onBlur={() => {
            setFocused(false);
            onBlur();
          }}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
        />
      )}
    />
  );
}

function ModelField({
  control,
  error,
  vehicleType,
}: {
  control: Control<VehicleCreateInput>;
  error?: string;
  vehicleType: Phase1VehicleType;
}) {
  const makeValue = useWatch({ control, name: 'make' }) ?? '';
  const modelValue = useWatch({ control, name: 'model' }) ?? '';
  const [focused, setFocused] = useState(false);
  const { suggestions, loading } = useModelSuggestions(
    makeValue,
    modelValue,
    focused,
    vehicleType,
  );

  return (
    <Controller
      control={control}
      name="model"
      render={({ field: { onChange, onBlur, value } }) => (
        <SuggestionInput
          autoCapitalize="words"
          autoCorrect={false}
          error={error}
          hint={
            makeValue.trim().length >= 2
              ? `Suggestions for ${makeValue.trim()} (${VEHICLE_TYPE_LABELS[vehicleType]})`
              : 'Enter make first for model suggestions (optional)'
          }
          label="Model"
          loading={loading}
          placeholder={getModelPlaceholder(vehicleType, makeValue)}
          suggestions={suggestions}
          value={value}
          onBlur={() => {
            setFocused(false);
            onBlur();
          }}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
        />
      )}
    />
  );
}

function VehicleTypeField({
  control,
  error,
  setValue,
}: {
  control: Control<VehicleCreateInput>;
  error?: string;
  setValue?: UseFormSetValue<VehicleCreateInput>;
}) {
  const { colors } = useTheme();

  return (
    <Controller
      control={control}
      name="vehicle_type"
      render={({ field: { onChange, value } }) => {
        const selected = (
          PHASE1_VEHICLE_TYPES.includes(value as Phase1VehicleType) ? value : 'car'
        ) as Phase1VehicleType;

        return (
          <View style={styles.typeBlock}>
            <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>Vehicle type</Text>
            <View style={styles.typeGrid}>
              {PHASE1_VEHICLE_TYPES.map((type) => {
                const isSelected = selected === type;
                return (
                  <Pressable
                    key={type}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      if (type !== selected) {
                        setValue?.('make', '', { shouldDirty: true, shouldValidate: false });
                        setValue?.('model', '', { shouldDirty: true, shouldValidate: false });
                      }
                      onChange(type);
                    }}
                    style={({ pressed }) => [
                      styles.typeChip,
                      {
                        backgroundColor: isSelected ? brand.green : colors.surface,
                        borderColor: isSelected ? brand.green : colors.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: isSelected ? brand.white : colors.textPrimary },
                      ]}
                    >
                      {VEHICLE_TYPE_LABELS[type]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {error ? (
              <Text accessibilityRole="alert" style={[styles.typeError, { color: colors.danger }]}>
                {error}
              </Text>
            ) : (
              <Text style={[styles.typeHint, { color: colors.textMuted }]}>
                Make & model suggestions update for Car, Van, 3 Wheel, or Motor Bike
              </Text>
            )}
          </View>
        );
      }}
    />
  );
}

export function VehicleFormFields({
  control,
  errors,
  setValue,
  compact = false,
}: VehicleFormFieldsProps) {
  const vehicleType = usePhase1VehicleType(control);

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name="registration_number"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            autoCapitalize="characters"
            error={errors.registration_number?.message}
            label="Registration number"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="e.g. CBC 007"
            value={value}
          />
        )}
      />

      <VehicleTypeField
        control={control}
        error={errors.vehicle_type?.message}
        setValue={setValue}
      />

      <MakeField control={control} error={errors.make?.message} vehicleType={vehicleType} />
      <ModelField control={control} error={errors.model?.message} vehicleType={vehicleType} />

      {!compact ? (
        <Controller
          control={control}
          name="nickname"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.nickname?.message}
              label="Nickname (optional)"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="e.g. Family car"
              value={value ?? ''}
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="manufacture_year"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            error={errors.manufacture_year?.message}
            keyboardType="number-pad"
            label="Manufacture year"
            onBlur={onBlur}
            onChangeText={(text) => {
              const parsed = parseInt(text, 10);
              onChange(Number.isNaN(parsed) ? 0 : parsed);
            }}
            placeholder="e.g. 2018"
            value={value ? String(value) : ''}
          />
        )}
      />
      <Controller
        control={control}
        name="current_odometer"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            error={errors.current_odometer?.message}
            keyboardType="number-pad"
            label="Current odometer (km)"
            onBlur={onBlur}
            onChangeText={(text) => {
              const parsed = parseInt(text.replace(/,/g, ''), 10);
              onChange(Number.isNaN(parsed) ? 0 : parsed);
            }}
            placeholder="e.g. 45000"
            value={value ? String(value) : ''}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  typeBlock: {
    gap: spacing.sm,
  },
  typeLabel: {
    ...typography.label,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    minHeight: minTouchTarget,
    minWidth: '47%',
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipText: {
    ...typography.bodyStrong,
  },
  typeHint: {
    ...typography.caption,
  },
  typeError: {
    ...typography.caption,
  },
});
