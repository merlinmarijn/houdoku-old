import fs from 'fs';
import React, { useEffect, useRef } from 'react';
import { ipcRenderer } from 'electron';
import { Series } from 'houdoku-extension-lib';
import { Overlay, SimpleGrid, Skeleton, Title, ScrollArea } from '@mantine/core';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import ipcChannels from '../../constants/ipcChannels.json';
import styles from './SearchGrid.css';
import { libraryColumnsState } from '../../state/settingStates';
import {
  searchResultState,
  addModalEditableState,
  addModalSeriesState,
  showingAddModalState,
  searchExtensionState,
} from '../../state/searchStates';
import { FS_METADATA } from '../../services/extensions/filesystem';
import ExtensionImage from '../general/ExtensionImage';

const thumbnailsDir = await ipcRenderer.invoke(ipcChannels.GET_PATH.THUMBNAILS_DIR);
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir);
}

type Props = {
  loading: boolean;
  inLibrary: (series: Series) => boolean;
  handleSearch: (fresh?: boolean) => void;
};

const SearchGrid: React.FC<Props> = (props: Props) => {
  const searchResult = useRecoilValue(searchResultState);
  const libraryColumns = useRecoilValue(libraryColumnsState);
  const searchExtension = useRecoilValue(searchExtensionState);
  const setAddModalSeries = useSetRecoilState(addModalSeriesState);
  const setAddModalEditable = useSetRecoilState(addModalEditableState);
  const [showingAddModal, setShowingAddModal] = useRecoilState(showingAddModalState);

  const viewport = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const renderSeriesGrid = () => {
    return searchResult.seriesList.map((series: Series) => {
      const inLibrary = props.inLibrary(series);

      return (
        <div
          key={series.sourceId}
          className={styles.coverContainer}
          onClick={() => {
            if (inLibrary) return;

            setAddModalSeries(series);
            setAddModalEditable(searchExtension === FS_METADATA.id);
            setShowingAddModal(!showingAddModal);
          }}
          style={{
            height: `calc(105vw / ${libraryColumns})`,
            cursor: inLibrary ? 'not-allowed' : 'pointer',
          }}
        >
          <Overlay
            gradient="linear-gradient(0deg, #000000cc, #00000000 40%, #00000000)"
            zIndex={5}
          />
          <ExtensionImage
            url={series.remoteCoverUrl}
            series={series}
            alt={series.title}
            width="100%"
            height="100%"
          />
          {inLibrary ? <Overlay opacity={0.5} color="#2B8A3E" /> : ''}
          <Title className={styles.seriesTitle} order={5} lineClamp={3} p={4}>
            {series.title}
          </Title>
        </div>
      );
    });
  };

  const renderLoadingSkeleton = () => {
    const amount =
      {
        2: 4,
        4: 20,
        6: 24,
        8: 40,
      }[libraryColumns] || 8;

    return [...Array(amount).keys()].map((x) => (
      <Skeleton key={`skeleton-${x}`} style={{ height: `calc(105vw / ${libraryColumns})` }} />
    ));
  };

  useEffect(() => {
    if (!props.loading && viewport.current) {
      if (searchResult.seriesList.length === 0) {
        viewport.current.scrollTo({ top: 0 });
      } else if (
        viewport.current &&
        gridRef.current &&
        gridRef.current.clientHeight < viewport.current.clientHeight
      )
        props.handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.loading]);

  const handleScroll = (position: { x: number; y: number }) => {
    if (!viewport.current || !searchResult.hasMore) return;

    const distanceFromBottom =
      viewport.current.scrollHeight - (viewport.current.clientHeight + position.y);
    const ratioOfVisibleHeight = distanceFromBottom / viewport.current.clientHeight;

    if (ratioOfVisibleHeight < 0.3) {
      props.handleSearch();
    }
  };

  return (
    <>
      <ScrollArea
        style={{ height: 'calc(100vh - 24px - 72px)' }}
        pr="xl"
        mr={-16}
        viewportRef={viewport}
        onScrollPositionChange={handleScroll}
      >
        <SimpleGrid cols={libraryColumns} spacing="xs" ref={gridRef}>
          {renderSeriesGrid()}
          {props.loading ? renderLoadingSkeleton() : ''}
        </SimpleGrid>
      </ScrollArea>
    </>
  );
};

export default SearchGrid;
