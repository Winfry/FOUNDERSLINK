import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { FileText, Trash2, Upload } from 'lucide-react-native';
import { colors, radius, spacing, touchTargetMin } from '../../theme/tokens';
import { Button } from './Button';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export interface UploadedFileMeta {
  name: string;
  size: number;
  mimeType: string;
  uri: string;
}

export function FileUploader({
  label,
  acceptLabel = 'PDF, JPG, PNG up to 10 MB',
  value,
  onChange,
  error,
}: {
  label: string;
  acceptLabel?: string;
  value?: UploadedFileMeta | null;
  onChange: (file: UploadedFileMeta | null) => void;
  error?: string;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const pick = async () => {
    setLocalError(null);
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_BYTES) {
      setLocalError('File exceeds 10 MB limit.');
      return;
    }
    if (asset.mimeType && !ALLOWED.includes(asset.mimeType)) {
      setLocalError('Unsupported file type.');
      return;
    }
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p === null || p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 25;
      });
    }, 120);
    setTimeout(() => {
      onChange({
        name: asset.name,
        size: asset.size ?? 0,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        uri: asset.uri,
      });
      setProgress(null);
    }, 500);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {!value ? (
        <Pressable style={styles.drop} onPress={pick} accessibilityRole="button">
          <Upload size={22} color={colors.primary} />
          <Text style={styles.dropTitle}>Upload file</Text>
          <Text style={styles.dropHint}>{acceptLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.fileRow}>
          <FileText size={22} color={colors.primary} />
          <View style={styles.fileMeta}>
            <Text style={styles.fileName} numberOfLines={1}>
              {value.name}
            </Text>
            <Text style={styles.fileSize}>{(value.size / 1024).toFixed(1)} KB · {value.mimeType}</Text>
          </View>
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={8}
            accessibilityLabel="Remove file"
            style={styles.remove}
          >
            <Trash2 size={20} color={colors.error} />
          </Pressable>
        </View>
      )}
      {progress !== null ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      ) : null}
      {localError || error ? (
        <Text style={styles.error}>{localError ?? error}</Text>
      ) : null}
      {value ? (
        <Button title="Replace file" variant="ghost" onPress={pick} style={styles.replace} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing[2] },
  label: { fontSize: 14, fontWeight: '500', marginBottom: spacing[1], color: colors.text },
  drop: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderStyle: 'dashed',
    padding: spacing[3],
    alignItems: 'center',
    gap: 4,
    minHeight: touchTargetMin * 2,
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  dropTitle: { fontWeight: '600', color: colors.primaryDark },
  dropHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing[2],
  },
  fileMeta: { flex: 1 },
  fileName: { fontWeight: '600', color: colors.text },
  fileSize: { fontSize: 12, color: colors.textMuted },
  remove: { minWidth: touchTargetMin, minHeight: touchTargetMin, alignItems: 'center', justifyContent: 'center' },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: spacing[1],
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  error: { color: colors.error, fontSize: 13, marginTop: 4 },
  replace: { marginTop: spacing[1] },
});
