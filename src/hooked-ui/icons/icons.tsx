import type { ReactElement } from "react";
import AudioIcon from "@icons/audio.icon.svg?react";
import AutoPlayIcon from "@icons/auto-play.icon.svg?react";
import ChevronIcon from "@icons/chevron-down.icon.svg?react";
import Fairness from "@icons/fairness.icon.svg?react";
import HamburgerIcon from "@icons/hamburger.icon.svg?react";
import HistoryIcon from "@icons/history.icon.svg?react";
import InfoIcon from "@icons/info.icon.svg?react";
import LogoIcon from "@icons/logo.svg?react";
import MinusIcon from "@icons/minus.icon.svg?react";
import MusicIcon from "@icons/music.icon.svg?react";
import PlusIcon from "@icons/plus.icon.svg?react";
import ScrollIcon from "@icons/scroll.icon.svg?react";
import SkipIcon from "@icons/skip.icon.svg?react";
import SkipFullIcon from "@icons/skip-full.icon.svg?react";
import SkipHalfIcon from "@icons/skip-half.icon.svg?react";
import XIcon from "@icons/x.icon.svg?react";

export enum IconKeys {
	LogoIcon = "LogoIcon",
	HamburgerIcon = "HamburgerIcon",
	XIcon = "XIcon",
	InfoIcon = "InfoIcon",
	MusicIcon = "MusicIcon",
	AudioIcon = "AudioIcon",
	ScrollIcon = "ScrollIcon",
	AutoPlayIcon = "AutoPlayIcon",
	HistoryIcon = "HistoryIcon",
	Chevron = "ChevronIcon",
	PlusIcon = "PlusIcon",
	MinusIcon = "MinusIcon",
	SkipIcon = "SkipIcon",
	SkipHalfIcon = "SkipHalfIcon",
	SkipFullIcon = "SkipFullIcon",
	Fairness = "Fairness"
}

export const ICONS: Record<IconKeys, ReactElement> = {
	LogoIcon: <LogoIcon />,
	HamburgerIcon: <HamburgerIcon />,
	XIcon: <XIcon />,
	InfoIcon: <InfoIcon />,
	MusicIcon: <MusicIcon />,
	AudioIcon: <AudioIcon />,
	ScrollIcon: <ScrollIcon />,
	AutoPlayIcon: <AutoPlayIcon />,
	HistoryIcon: <HistoryIcon />,
	ChevronIcon: <ChevronIcon />,
	PlusIcon: <PlusIcon />,
	MinusIcon: <MinusIcon />,
	SkipIcon: <SkipIcon />,
	SkipHalfIcon: <SkipHalfIcon />,
	SkipFullIcon: <SkipFullIcon />,
	Fairness: <Fairness />
};
