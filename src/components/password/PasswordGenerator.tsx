'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generatePassword } from '@/lib/crypto';
import type { CharacterSet } from '@/lib/types';
import { Copy, RefreshCw } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';

export default function PasswordGenerator() {
  const { toast } = useToast();
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [length, setLength] = useState(20);
  const [charSets, setCharSets] = useState<CharacterSet[]>(['lowercase', 'uppercase', 'digits']);
  const [excludeChars, setExcludeChars] = useState('');

  const handleGenerate = () => {
    if (charSets.length === 0) {
      toast({ variant: 'destructive', title: 'Please select at least one character set.' });
      return;
    }
    const newPassword = generatePassword(length, charSets, excludeChars);
    setGeneratedPassword(newPassword);
  };
  
  const handleCopy = () => {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword);
    toast({ title: 'Password copied to clipboard!' });
  };
  
  const handleCheckboxChange = (set: CharacterSet, checked: boolean) => {
    setCharSets(prev => checked ? [...prev, set] : prev.filter(s => s !== set));
  };
  
  // Generate a password on initial load
  useState(() => {
    handleGenerate();
  });

  return (
    <Card className="max-w-2xl mx-auto bg-card/50 backdrop-blur-lg border border-border/30">
      <CardHeader>
        <CardTitle className="font-headline">Generator Options</CardTitle>
        <CardDescription>Customize the parameters for your new password.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-background">
          <Input 
            readOnly 
            value={generatedPassword} 
            className="flex-grow text-lg font-mono border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Click Generate..."
            aria-label="Generated Password"
          />
          <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy password">
            <Copy className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleGenerate} aria-label="Generate new password">
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="length">Password Length: {length}</Label>
                <Slider
                    id="length"
                    min={8}
                    max={128}
                    step={1}
                    value={[length]}
                    onValueChange={(value) => setLength(value[0])}
                />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['lowercase', 'uppercase', 'digits', 'symbols'] as CharacterSet[]).map(set => (
                    <div key={set} className="flex items-center space-x-2">
                        <Checkbox 
                            id={set} 
                            checked={charSets.includes(set)}
                            onCheckedChange={(checked) => handleCheckboxChange(set, !!checked)}
                        />
                        <Label htmlFor={set} className="capitalize">{set}</Label>
                    </div>
                ))}
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="exclude">Exclude Characters</Label>
                <Input
                    id="exclude"
                    value={excludeChars}
                    onChange={(e) => setExcludeChars(e.target.value)}
                    placeholder="e.g., i, l, 1, o, 0"
                />
            </div>
        </div>

        <Button onClick={handleGenerate} className="w-full">
            Generate Password
        </Button>
      </CardContent>
    </Card>
  );
}
