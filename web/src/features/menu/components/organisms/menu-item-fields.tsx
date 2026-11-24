"use client";

import { cn } from "cn";
import { Input } from "@/src/components/ui/atoms/input";
import SelectField from "@/src/components/ui/atoms/select-field";
import Textarea from "@/src/components/ui/atoms/textarea";
import FormField, { fieldMessageId } from "@/src/features/brands/components/molecules/form-field";
import LogoField, { type LogoPreview } from "@/src/features/brands/components/molecules/logo-field";
import { DELIVERY_CHANNELS, type MenuModifierOption } from "../../utils/menu";
import { LIMITS, type MenuItemFormErrors, type MenuItemFormValues } from "../../utils/menu-form";
import ChannelEditor, { channelPriceId } from "../molecules/channel-editor";
import ModifierEditor, { modifierPriceId } from "../molecules/modifier-editor";
import PriceInput from "../molecules/price-input";

/** Field ids in form order, so a failed save can move focus to the first problem. */
export const FIELD_ORDER = ["name", "code", "basePrice", "servingDescription", "recipeId", "description"] as const;

/** The id of the first field with a problem, in the order the form shows them. */
export function firstProblemId(idPrefix: string, errors: MenuItemFormErrors): string | undefined {
  const field = FIELD_ORDER.find((name) => name in errors);
  if (field) return `${idPrefix}-${field}`;
  const channel = DELIVERY_CHANNELS.find((c) => errors.channels?.[c]);
  if (channel) return channelPriceId(channel);
  const modifier = Object.keys(errors.modifiers ?? {})[0];
  return modifier ? modifierPriceId(modifier) : undefined;
}

type MenuItemFieldsProps = {
  /** Prefixes every field id, e.g. "edit-menu-item" gives "edit-menu-item-name". */
  idPrefix: string;
  values: MenuItemFormValues;
  onChange: <K extends keyof MenuItemFormValues>(key: K, value: MenuItemFormValues[K]) => void;
  errors: MenuItemFormErrors;
  photo: {
    preview: LogoPreview | null;
    onSelect: (file: File) => void;
    onRemove?: () => void;
    error?: string;
    hint: string;
  };
  codeHint?: string;
  recipes: { id: string; name: string }[];
  /** Shown as the recipe picker's first, unpickable option while no recipe is chosen. */
  recipePlaceholder?: string;
  recipeDisabled?: boolean;
  modifierCatalog: MenuModifierOption[];
  modifierCatalogLoading?: boolean;
  /** Off when every modifier is new anyway, as on a brand-new item. */
  tagNewModifiers?: boolean;
};

// The fields an item is added and edited with: photo, what it's called, what
// it costs, what the kitchen makes, then its modifiers.
export default function MenuItemFields({
  idPrefix,
  values,
  onChange: set,
  errors,
  photo,
  codeHint,
  recipes,
  recipePlaceholder,
  recipeDisabled = false,
  modifierCatalog,
  modifierCatalogLoading = false,
  tagNewModifiers = true,
}: MenuItemFieldsProps) {
  const id = (name: string) => `${idPrefix}-${name}`;

  const textField = (
    name: "name" | "servingDescription",
    label: string,
    options: { maxLength: number; hint?: string; placeholder?: string },
  ) => {
    const error = errors[name];
    return (
      <FormField id={id(name)} label={label} hint={options.hint} error={error}>
        <Input
          id={id(name)}
          autoComplete="off"
          maxLength={options.maxLength}
          placeholder={options.placeholder}
          value={values[name]}
          onChange={(e) => set(name, e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={fieldMessageId(id(name), Boolean(error || options.hint))}
        />
      </FormField>
    );
  };

  return (
    <>
      <FormField id={id("photo")} label="Photo" hint={photo.hint} error={photo.error}>
        <LogoField
          id={id("photo")}
          preview={photo.preview}
          onSelect={photo.onSelect}
          onRemove={photo.onRemove}
          invalid={Boolean(photo.error)}
          shape="square"
          previewAlt="Menu item photo preview"
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] sm:gap-4">
        {textField("name", "Name", { maxLength: LIMITS.name })}

        <FormField id={id("code")} label="Code" hint={codeHint} error={errors.code}>
          <Input
            id={id("code")}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={LIMITS.code}
            value={values.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            aria-invalid={Boolean(errors.code)}
            aria-describedby={fieldMessageId(id("code"), Boolean(errors.code || codeHint))}
            className="font-mono text-sm tracking-[0.04em] uppercase md:text-sm"
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] sm:gap-4">
        <FormField id={id("basePrice")} label="Base price" error={errors.basePrice}>
          <PriceInput
            id={id("basePrice")}
            value={values.basePrice}
            onChange={(e) => set("basePrice", e.target.value)}
            aria-invalid={Boolean(errors.basePrice)}
            aria-describedby={fieldMessageId(id("basePrice"), Boolean(errors.basePrice))}
          />
        </FormField>
        {textField("servingDescription", "Serving", {
          maxLength: LIMITS.servingDescription,
          placeholder: "e.g. Good for 2",
        })}
      </div>

      <FormField
        id={id("recipeId")}
        label="Recipe"
        hint="What the kitchen follows when this item is ordered."
        error={errors.recipeId}
      >
        <SelectField
          id={id("recipeId")}
          value={values.recipeId}
          disabled={recipeDisabled}
          onChange={(e) => set("recipeId", e.target.value)}
          aria-invalid={Boolean(errors.recipeId)}
          aria-describedby={`${id("recipeId")}-message`}
          className={cn(!values.recipeId && "text-ink-muted")}
        >
          {recipePlaceholder !== undefined && !values.recipeId ? (
            <option value="" disabled>
              {recipePlaceholder}
            </option>
          ) : null}
          {recipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.name}
            </option>
          ))}
        </SelectField>
      </FormField>

      <FormField
        id={id("description")}
        label="Description"
        hint={`Optional. ${values.description.trim().length} of ${LIMITS.description} characters.`}
        error={errors.description}
      >
        <Textarea
          id={id("description")}
          rows={3}
          maxLength={LIMITS.description}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={`${id("description")}-message`}
        />
      </FormField>

      <div className="border-t border-hairline pt-5">
        <ChannelEditor
          drafts={values.channels}
          onChange={(channels) => set("channels", channels)}
          basePrice={values.basePrice}
          errors={errors.channels}
        />
      </div>

      <div className="border-t border-hairline pt-5">
        <ModifierEditor
          drafts={values.modifiers}
          onChange={(modifiers) => set("modifiers", modifiers)}
          catalog={modifierCatalog}
          catalogLoading={modifierCatalogLoading}
          errors={errors.modifiers}
          tagNew={tagNewModifiers}
        />
      </div>
    </>
  );
}
