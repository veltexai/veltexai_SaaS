'use client';

import { useEffect, useRef } from 'react';

interface ProposalViewTrackerProps {
  trackingId: string;
  proposalId: string;
}

export function ProposalViewTracker({ trackingId, proposalId }: ProposalViewTrackerProps) {
  const hasTracked = useRef(false);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    // Track initial view
    if (!hasTracked.current) {
      hasTracked.current = true;
      
      // Send view tracking
      fetch(`/api/tracking/view/${trackingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposal_id: proposalId,
          user_agent: navigator.userAgent,
          referrer: document.referrer,
        }),
      }).catch(console.error);
    }

    // Track time spent on page
    const handleBeforeUnload = () => {
      const timeSpent = Date.now() - startTime.current;
      
      // Use sendBeacon for reliable tracking on page unload
      if (navigator.sendBeacon) {
        const data = JSON.stringify({
          tracking_id: trackingId,
          time_spent: timeSpent,
        });
        
        navigator.sendBeacon('/api/tracking/time-spent', data);
      }
    };

    // Track scroll depth
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);
      
      // Track significant scroll milestones
      if (scrollPercent >= 25 && scrollPercent < 50) {
        trackScrollMilestone(25);
      } else if (scrollPercent >= 50 && scrollPercent < 75) {
        trackScrollMilestone(50);
      } else if (scrollPercent >= 75 && scrollPercent < 90) {
        trackScrollMilestone(75);
      } else if (scrollPercent >= 90) {
        trackScrollMilestone(90);
      }
    };

    const trackScrollMilestone = (percent: number) => {
      // Debounce scroll tracking
      const key = `scroll_${percent}_${trackingId}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, 'true');
        
        fetch('/api/tracking/scroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tracking_id: trackingId,
            scroll_percent: percent,
          }),
        }).catch(console.error);
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('scroll', handleScroll);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [trackingId, proposalId]);

  // Track clicks on important elements
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Track clicks on buttons, links, and important elements
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a')
      ) {
        const elementText = target.textContent?.trim() || '';
        const elementType = target.tagName.toLowerCase();
        
        fetch('/api/tracking/click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tracking_id: trackingId,
            element_type: elementType,
            element_text: elementText,
            element_id: target.id || null,
            element_class: target.className || null,
          }),
        }).catch(console.error);
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [trackingId]);

  // This component doesn't render anything visible
  return null;
}